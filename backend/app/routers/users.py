from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.audit_log import AuditLog, AuditAction, AuditResourceType
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.routers.dependencies import get_current_user, get_current_admin_user, get_client_info

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=List[UserResponse])
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(User)

    if search:
        query = query.where(
            or_(
                User.username.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%")
            )
        )

    if role:
        query = query.where(User.role == role)

    if is_active is not None:
        query = query.where(User.is_active == is_active)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(User.created_at.desc())

    result = await db.execute(query)
    users = result.scalars().all()

    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    client_info = get_client_info(request)

    # Check if user exists
    existing = await db.execute(select(User).where(
        (User.email == user_data.email) | (User.username == user_data.username)
    ))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email or username already registered")

    from app.core.security import get_password_hash
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role=user_data.role,
        is_verified=True
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    from app.models.mfa import MFAConfig
    mfa_config = MFAConfig(user_id=user.id, allowed_methods='["totp", "backup_codes"]')
    db.add(mfa_config)
    await db.commit()

    from app.routers.auth import create_audit_log
    await create_audit_log(
        db, AuditAction.CREATE, AuditResourceType.USER,
        resource_id=str(user.id), resource_name=user.username,
        user_id=current_user.id, ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
        new_values={"email": user.email, "username": user.username, "role": user.role.value},
        description=f"Admin {current_user.username} created user {user.username}"
    )

    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    client_info = get_client_info(request)

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Store old values for audit
    old_values = {
        "email": user.email,
        "username": user.username,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "role": user.role.value
    }

    update_data = user_data.model_dump(exclude_unset=True)
    changed_fields = []

    for field, value in update_data.items():
        if getattr(user, field) != value:
            changed_fields.append(field)
            setattr(user, field, value)

    if changed_fields:
        user.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(user)

        new_values = {field: getattr(user, field) for field in changed_fields}

        from app.routers.auth import create_audit_log
        await create_audit_log(
            db, AuditAction.UPDATE, AuditResourceType.USER,
            resource_id=str(user.id), resource_name=user.username,
            user_id=current_user.id, ip_address=client_info["ip"],
            user_agent=client_info["user_agent"],
            old_values=old_values, new_values=new_values,
            changed_fields=changed_fields,
            description=f"Admin {current_user.username} updated user {user.username}"
        )

    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    client_info = get_client_info(request)

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    username = user.username
    await db.delete(user)
    await db.commit()

    from app.routers.auth import create_audit_log
    await create_audit_log(
        db, AuditAction.DELETE, AuditResourceType.USER,
        resource_id=str(user_id), resource_name=username,
        user_id=current_user.id, ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
        description=f"Admin {current_user.username} deleted user {username}"
    )


@router.post("/{user_id}/activate", response_model=UserResponse)
async def activate_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    client_info = get_client_info(request)

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = True
    user.failed_login_attempts = 0
    user.locked_until = None
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)

    from app.routers.auth import create_audit_log
    await create_audit_log(
        db, AuditAction.ENABLE, AuditResourceType.USER,
        resource_id=str(user.id), resource_name=user.username,
        user_id=current_user.id, ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
        description=f"Admin {current_user.username} activated user {user.username}"
    )

    return user


@router.post("/{user_id}/deactivate", response_model=UserResponse)
async def deactivate_user(
    user_id: int,
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    client_info = get_client_info(request)

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)

    from app.routers.auth import create_audit_log
    await create_audit_log(
        db, AuditAction.DISABLE, AuditResourceType.USER,
        resource_id=str(user.id), resource_name=user.username,
        user_id=current_user.id, ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
        description=f"Admin {current_user.username} deactivated user {user.username}"
    )

    return user