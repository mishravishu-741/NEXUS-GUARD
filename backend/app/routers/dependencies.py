from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, UserRole
from app.models.session import LoginSession, SessionStatus
from app.models.device import Device


security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    if not credentials:
        return None

    payload = decode_token(credentials.credentials)
    if not payload:
        return None

    user_id = payload.get("user_id")
    if not user_id:
        return None

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        return None

    return user


def get_client_info(request: Request) -> dict:
    # Get real IP from headers (for reverse proxy setups)
    forwarded_for = request.headers.get("X-Forwarded-For")
    real_ip = request.headers.get("X-Real-IP")

    if forwarded_for:
        ip = forwarded_for.split(",")[0].strip()
    elif real_ip:
        ip = real_ip
    else:
        ip = request.client.host if request.client else "unknown"

    user_agent = request.headers.get("User-Agent", "unknown")

    # Extract device fingerprint from headers
    device_id = request.headers.get("X-Device-ID")

    # Simple location detection (in production, use GeoIP)
    location = "Unknown"

    return {
        "ip": ip,
        "user_agent": user_agent,
        "device_id": device_id,
        "location": location
    }


async def get_current_session(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> LoginSession:
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    session_id = payload.get("session_id")
    if not session_id:
        raise HTTPException(status_code=401, detail="No session in token")

    result = await db.execute(
        select(LoginSession).where(LoginSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session or session.status != SessionStatus.ACTIVE:
        raise HTTPException(status_code=401, detail="Session invalid")

    return session


def require_permissions(*permissions: str):
    async def permission_checker(current_user: User = Depends(get_current_user)):
        # In a real implementation, check user permissions against required permissions
        # For now, admin has all permissions
        if current_user.role == UserRole.ADMIN:
            return current_user

        # Check if user has required permissions (would need a permissions system)
        # This is a placeholder for future implementation
        return current_user

    return permission_checker