from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
from datetime import datetime, timedelta
import secrets

from app.core.database import get_db
from app.core.security import (
    verify_password, get_password_hash, create_access_token, create_refresh_token,
    decode_token, generate_mfa_secret, get_mfa_uri, generate_qr_code,
    verify_mfa_token, hash_token
)
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.device import Device
from app.models.mfa import MFAConfig, MFAMethod
from app.models.session import LoginSession, SessionStatus
from app.models.security_event import SecurityEvent, SecurityEventType, SecurityEventSeverity
from app.models.audit_log import AuditLog, AuditAction, AuditResourceType
from app.schemas.user import (
    UserCreate, UserLogin, UserResponse, Token, RefreshToken,
    MFASetup, MFAVerify, MFAStatus, BackupCodeResponse
)
from app.routers.dependencies import get_current_user, get_current_admin_user, get_client_info

router = APIRouter(prefix="/auth", tags=["Authentication"])


async def create_security_event(
    db: AsyncSession,
    event_type: SecurityEventType,
    severity: SecurityEventSeverity,
    title: str,
    description: str = None,
    user_id: int = None,
    device_id: int = None,
    ip_address: str = None,
    user_agent: str = None,
    location: str = None,
    metadata: dict = None,
    risk_score: int = 0
):
    event = SecurityEvent(
        event_type=event_type,
        severity=severity,
        title=title,
        description=description,
        user_id=user_id,
        device_id=device_id,
        ip_address=ip_address,
        user_agent=user_agent,
        location=location,
        event_metadata=metadata,
        risk_score=risk_score
    )
    db.add(event)
    await db.commit()


async def create_audit_log(
    db: AsyncSession,
    action: AuditAction,
    resource_type: AuditResourceType,
    resource_id: str = None,
    resource_name: str = None,
    user_id: int = None,
    ip_address: str = None,
    user_agent: str = None,
    old_values: dict = None,
    new_values: dict = None,
    changed_fields: List[str] = None,
    description: str = None,
    success: bool = True,
    error_message: str = None,
    metadata: dict = None,
    correlation_id: str = None
):
    log = AuditLog(
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        resource_name=resource_name,
        user_id=user_id,
        ip_address=ip_address,
        user_agent=user_agent,
        old_values=old_values,
        new_values=new_values,
        changed_fields=changed_fields,
        description=description,
        success=success,
        error_message=error_message,
        audit_metadata=metadata,
        correlation_id=correlation_id
    )
    db.add(log)
    await db.commit()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    client_info = get_client_info(request)

    # Check if user exists
    existing = await db.execute(select(User).where(
        (User.email == user_data.email) | (User.username == user_data.username)
    ))
    if existing.scalar_one_or_none():
        await create_security_event(
            db, SecurityEventType.LOGIN_FAILURE, SecurityEventSeverity.MEDIUM,
            "Registration attempt with existing credentials",
            f"Email: {user_data.email}, Username: {user_data.username}",
            ip_address=client_info["ip"], user_agent=client_info["user_agent"],
            risk_score=30
        )
        raise HTTPException(status_code=400, detail="Email or username already registered")

    # Create user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role=user_data.role,
        is_verified=True  # Auto-verify for now
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Create MFA config
    mfa_config = MFAConfig(user_id=user.id, allowed_methods='["totp", "backup_codes"]')
    db.add(mfa_config)
    await db.commit()

    # Log security event
    await create_security_event(
        db, SecurityEventType.LOGIN_SUCCESS, SecurityEventSeverity.INFO,
        "New user registered",
        f"User {user.username} registered",
        user_id=user.id, ip_address=client_info["ip"],
        user_agent=client_info["user_agent"]
    )

    await create_audit_log(
        db, AuditAction.CREATE, AuditResourceType.USER,
        resource_id=str(user.id), resource_name=user.username,
        user_id=user.id, ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
        new_values={"email": user.email, "username": user.username, "role": user.role.value},
        description=f"User {user.username} registered"
    )

    return user


@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    client_info = get_client_info(request)

    # Find user
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user:
        await create_security_event(
            db, SecurityEventType.LOGIN_FAILURE, SecurityEventSeverity.MEDIUM,
            "Login attempt with non-existent email",
            f"Email: {credentials.email}",
            ip_address=client_info["ip"], user_agent=client_info["user_agent"],
            risk_score=40
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
        await create_security_event(
            db, SecurityEventType.LOGIN_FAILURE, SecurityEventSeverity.HIGH,
            "Login attempt on inactive account",
            f"User: {user.username}",
            user_id=user.id, ip_address=client_info["ip"],
            user_agent=client_info["user_agent"], risk_score=60
        )
        raise HTTPException(status_code=401, detail="Account is deactivated")

    # Check if locked
    if user.locked_until and user.locked_until > datetime.utcnow():
        await create_security_event(
            db, SecurityEventType.LOGIN_FAILURE, SecurityEventSeverity.HIGH,
            "Login attempt on locked account",
            f"User: {user.username}",
            user_id=user.id, ip_address=client_info["ip"],
            user_agent=client_info["user_agent"], risk_score=70
        )
        raise HTTPException(status_code=401, detail="Account temporarily locked")

    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=15)

        await db.commit()

        await create_security_event(
            db, SecurityEventType.LOGIN_FAILURE, SecurityEventSeverity.MEDIUM,
            "Invalid password",
            f"User: {user.username}, Attempts: {user.failed_login_attempts}",
            user_id=user.id, ip_address=client_info["ip"],
            user_agent=client_info["user_agent"], risk_score=50
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # Reset failed attempts on success
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()
    await db.commit()

    # Check MFA
    mfa_result = await db.execute(select(MFAConfig).where(MFAConfig.user_id == user.id))
    mfa_config = mfa_result.scalar_one_or_none()

    mfa_required = mfa_config and mfa_config.required_for_login and mfa_config.totp_enabled

    if mfa_required and not credentials.mfa_token:
        # Return token with MFA required flag
        access_token = create_access_token(
            data={"sub": user.email, "user_id": user.id, "role": user.role.value},
            expires_delta=timedelta(minutes=5)  # Short expiry for MFA challenge
        )
        return Token(
            access_token=access_token,
            refresh_token="",
            token_type="bearer",
            expires_in=300,
            mfa_required=True
        )

    if mfa_required and credentials.mfa_token:
        if not mfa_config.totp_secret or not verify_mfa_token(mfa_config.totp_secret, credentials.mfa_token):
            await create_security_event(
                db, SecurityEventType.LOGIN_MFA_FAILURE, SecurityEventSeverity.HIGH,
                "Invalid MFA token",
                f"User: {user.username}",
                user_id=user.id, ip_address=client_info["ip"],
                user_agent=client_info["user_agent"], risk_score=70
            )
            raise HTTPException(status_code=401, detail="Invalid MFA token")

        await create_security_event(
            db, SecurityEventType.LOGIN_MFA_SUCCESS, SecurityEventSeverity.INFO,
            "MFA verification successful",
            f"User: {user.username}",
            user_id=user.id, ip_address=client_info["ip"],
            user_agent=client_info["user_agent"]
        )

    # Create session
    session_token = secrets.token_urlsafe(32)
    refresh_token = secrets.token_urlsafe(32)
    refresh_token_hash = hash_token(refresh_token)

    # Find or create device
    device = None
    if client_info["device_id"]:
        device_result = await db.execute(
            select(Device).where(Device.device_id == client_info["device_id"])
        )
        device = device_result.scalar_one_or_none()

    session = LoginSession(
        session_token=session_token,
        refresh_token_hash=refresh_token_hash,
        user_id=user.id,
        device_id=device.id if device else None,
        ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
        location=client_info["location"],
        mfa_verified=bool(credentials.mfa_token),
        mfa_method="totp" if credentials.mfa_token else None,
        expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    )
    db.add(session)
    await db.commit()

    # Create tokens
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id, "role": user.role.value, "session_id": session.id}
    )
    refresh_token_full = create_refresh_token(
        data={"sub": user.email, "user_id": user.id, "session_id": session.id}
    )

    await create_security_event(
        db, SecurityEventType.LOGIN_SUCCESS, SecurityEventSeverity.INFO,
        "User logged in successfully",
        f"User: {user.username}",
        user_id=user.id, ip_address=client_info["ip"],
        user_agent=client_info["user_agent"]
    )

    await create_audit_log(
        db, AuditAction.LOGIN, AuditResourceType.SESSION,
        resource_id=str(session.id), user_id=user.id,
        ip_address=client_info["ip"], user_agent=client_info["user_agent"],
        description=f"User {user.username} logged in"
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token_full,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        mfa_required=False
    )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: RefreshToken,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    client_info = get_client_info(request)

    payload = decode_token(token_data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    session_id = payload.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    result = await db.execute(
        select(LoginSession).where(LoginSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session or session.status != SessionStatus.ACTIVE:
        raise HTTPException(status_code=401, detail="Session invalid or expired")

    if session.expires_at < datetime.utcnow():
        session.status = SessionStatus.EXPIRED
        await db.commit()
        raise HTTPException(status_code=401, detail="Session expired")

    # Verify refresh token hash
    from app.core.security import verify_password
    if not verify_password(token_data.refresh_token, session.refresh_token_hash):
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    # Update session activity
    session.last_activity = datetime.utcnow()
    await db.commit()

    # Get user
    user_result = await db.execute(select(User).where(User.id == session.user_id))
    user = user_result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    # Create new tokens
    access_token = create_access_token(
        data={"sub": user.email, "user_id": user.id, "role": user.role.value, "session_id": session.id}
    )
    new_refresh_token = create_refresh_token(
        data={"sub": user.email, "user_id": user.id, "session_id": session.id}
    )

    return Token(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    client_info = get_client_info(request)

    # Revoke current session
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        payload = decode_token(token)
        if payload and payload.get("session_id"):
            result = await db.execute(
                select(LoginSession).where(LoginSession.id == payload["session_id"])
            )
            session = result.scalar_one_or_none()
            if session:
                session.status = SessionStatus.LOGOUT
                session.revoked_at = datetime.utcnow()
                session.revoked_reason = "User logout"
                await db.commit()

    await create_security_event(
        db, SecurityEventType.LOGOUT, SecurityEventSeverity.INFO,
        "User logged out",
        f"User: {current_user.username}",
        user_id=current_user.id, ip_address=client_info["ip"],
        user_agent=client_info["user_agent"]
    )

    await create_audit_log(
        db, AuditAction.LOGOUT, AuditResourceType.SESSION,
        user_id=current_user.id, ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
        description=f"User {current_user.username} logged out"
    )

    return {"message": "Successfully logged out"}


@router.post("/mfa/setup", response_model=MFASetup)
async def setup_mfa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(MFAConfig).where(MFAConfig.user_id == current_user.id))
    mfa_config = result.scalar_one_or_none()

    if not mfa_config:
        mfa_config = MFAConfig(user_id=current_user.id, allowed_methods='["totp", "backup_codes"]')
        db.add(mfa_config)
        await db.commit()
        await db.refresh(mfa_config)

    if mfa_config.totp_enabled:
        raise HTTPException(status_code=400, detail="MFA already enabled")

    # Generate new secret
    secret = generate_mfa_secret()
    mfa_config.totp_secret = secret
    await db.commit()

    # Generate QR code
    uri = get_mfa_uri(current_user.email, secret)
    qr_code = generate_qr_code(uri)

    # Generate backup codes
    backup_codes = [secrets.token_hex(4).upper() for _ in range(10)]
    hashed_codes = [hash_token(code) for code in backup_codes]
    import json
    mfa_config.backup_codes = json.dumps(hashed_codes)
    mfa_config.backup_codes_used = json.dumps([])
    await db.commit()

    await create_audit_log(
        db, AuditAction.ENABLE, AuditResourceType.MFA,
        resource_id=str(current_user.id), user_id=current_user.id,
        description="MFA setup initiated"
    )

    return MFASetup(secret=secret, qr_code=qr_code, backup_codes=backup_codes)


@router.post("/mfa/verify", response_model=Token)
async def verify_mfa(
    mfa_data: MFAVerify,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(MFAConfig).where(MFAConfig.user_id == current_user.id))
    mfa_config = result.scalar_one_or_none()

    if not mfa_config or not mfa_config.totp_secret:
        raise HTTPException(status_code=400, detail="MFA not set up")

    if not verify_mfa_token(mfa_config.totp_secret, mfa_data.token):
        raise HTTPException(status_code=401, detail="Invalid MFA token")

    mfa_config.totp_enabled = True
    mfa_config.totp_verified_at = datetime.utcnow()
    mfa_config.required_for_login = True
    await db.commit()

    await create_security_event(
        db, SecurityEventType.MFA_ENABLED, SecurityEventSeverity.INFO,
        "MFA enabled",
        f"User: {current_user.username}",
        user_id=current_user.id
    )

    await create_audit_log(
        db, AuditAction.ENABLE, AuditResourceType.MFA,
        resource_id=str(current_user.id), user_id=current_user.id,
        description="MFA enabled and verified"
    )

    # Create new tokens with MFA verified
    access_token = create_access_token(
        data={"sub": current_user.email, "user_id": current_user.id, "role": current_user.role.value}
    )
    refresh_token = create_refresh_token(
        data={"sub": current_user.email, "user_id": current_user.id}
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@router.get("/mfa/status", response_model=MFAStatus)
async def get_mfa_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(MFAConfig).where(MFAConfig.user_id == current_user.id))
    mfa_config = result.scalar_one_or_none()

    if not mfa_config:
        return MFAStatus(enabled=False, backup_codes_remaining=0)

    import json
    used_codes = json.loads(mfa_config.backup_codes_used) if mfa_config.backup_codes_used else []
    total_codes = len(json.loads(mfa_config.backup_codes)) if mfa_config.backup_codes else 0

    return MFAStatus(
        enabled=mfa_config.totp_enabled,
        method="totp" if mfa_config.totp_enabled else None,
        verified_at=mfa_config.totp_verified_at,
        backup_codes_remaining=total_codes - len(used_codes)
    )


@router.post("/mfa/disable")
async def disable_mfa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(MFAConfig).where(MFAConfig.user_id == current_user.id))
    mfa_config = result.scalar_one_or_none()

    if not mfa_config:
        raise HTTPException(status_code=400, detail="MFA not configured")

    mfa_config.totp_enabled = False
    mfa_config.totp_secret = None
    mfa_config.required_for_login = False
    mfa_config.backup_codes = None
    mfa_config.backup_codes_used = None
    await db.commit()

    await create_audit_log(
        db, AuditAction.DISABLE, AuditResourceType.MFA,
        resource_id=str(current_user.id), user_id=current_user.id,
        description="MFA disabled"
    )

    return {"message": "MFA disabled successfully"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    return current_user