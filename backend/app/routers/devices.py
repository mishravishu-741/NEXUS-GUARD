from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.device import Device, DeviceStatus, DeviceType
from app.models.user import User, UserRole
from app.models.security_event import SecurityEvent, SecurityEventType, SecurityEventSeverity
from app.models.audit_log import AuditLog, AuditAction, AuditResourceType
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceResponse, DeviceListResponse, DeviceApproval
from app.routers.dependencies import get_current_user, get_current_admin_user, get_client_info
from app.services.zero_trust import calculate_device_trust_score

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.get("", response_model=DeviceListResponse)
async def list_devices(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[DeviceStatus] = None,
    device_type: Optional[DeviceType] = None,
    owner_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Device)

    # Non-admin users can only see their own devices
    if current_user.role != UserRole.ADMIN:
        query = query.where(Device.owner_id == current_user.id)
    elif owner_id:
        query = query.where(Device.owner_id == owner_id)

    if search:
        query = query.where(
            or_(
                Device.name.ilike(f"%{search}%"),
                Device.device_id.ilike(f"%{search}%"),
                Device.ip_address.ilike(f"%{search}%"),
                Device.location.ilike(f"%{search}%")
            )
        )

    if status:
        query = query.where(Device.status == status)

    if device_type:
        query = query.where(Device.device_type == device_type)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(desc(Device.last_seen))

    result = await db.execute(query)
    devices = result.scalars().all()

    return DeviceListResponse(
        devices=devices,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()

    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # Non-admin users can only access their own devices
    if current_user.role != UserRole.ADMIN and device.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this device")

    return device


@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
async def register_device(
    device_data: DeviceCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    client_info = get_client_info(request)

    # Check if device already exists
    existing = await db.execute(select(Device).where(Device.device_id == device_data.device_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Device already registered")

    # Create device
    device = Device(
        device_id=device_data.device_id,
        name=device_data.name,
        device_type=device_data.device_type,
        status=DeviceStatus.PENDING,
        owner_id=current_user.id,
        user_agent=device_data.user_agent,
        screen_resolution=device_data.screen_resolution,
        timezone=device_data.timezone,
        language=device_data.language,
        ip_address=device_data.ip_address or client_info["ip"],
        location=device_data.location or client_info["location"],
        os_name=device_data.os_name,
        os_version=device_data.os_version,
        browser_name=device_data.browser_name,
        browser_version=device_data.browser_version,
        first_seen=datetime.utcnow(),
        last_seen=datetime.utcnow()
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)

    # Calculate initial trust score
    trust_assessment = await calculate_device_trust_score(device, db)
    device.trust_score = trust_assessment.trust_score
    device.risk_score = trust_assessment.risk_score
    await db.commit()

    from app.routers.auth import create_security_event, create_audit_log
    await create_security_event(
        db, SecurityEventType.DEVICE_REGISTERED, SecurityEventSeverity.INFO,
        "New device registered",
        f"Device: {device.name} ({device.device_id})",
        user_id=current_user.id, device_id=device.id,
        ip_address=client_info["ip"], user_agent=client_info["user_agent"]
    )

    await create_audit_log(
        db, AuditAction.CREATE, AuditResourceType.DEVICE,
        resource_id=str(device.id), resource_name=device.name,
        user_id=current_user.id, ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
        new_values={"device_id": device.device_id, "name": device.name, "status": device.status.value},
        description=f"User {current_user.username} registered device {device.name}"
    )

    return device


@router.patch("/{device_id}", response_model=DeviceResponse)
async def update_device(
    device_id: int,
    device_data: DeviceUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    client_info = get_client_info(request)

    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()

    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # Non-admin users can only update their own devices
    if current_user.role != UserRole.ADMIN and device.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this device")

    old_values = {
        "name": device.name,
        "status": device.status.value,
        "device_type": device.device_type.value,
        "location": device.location
    }

    update_data = device_data.model_dump(exclude_unset=True)
    changed_fields = []

    for field, value in update_data.items():
        if getattr(device, field) != value:
            changed_fields.append(field)
            setattr(device, field, value)

    if changed_fields:
        device.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(device)

        new_values = {field: getattr(device, field) for field in changed_fields}

        from app.routers.auth import create_audit_log
        await create_audit_log(
            db, AuditAction.UPDATE, AuditResourceType.DEVICE,
            resource_id=str(device.id), resource_name=device.name,
            user_id=current_user.id, ip_address=client_info["ip"],
            user_agent=client_info["user_agent"],
            old_values=old_values, new_values=new_values,
            changed_fields=changed_fields,
            description=f"User {current_user.username} updated device {device.name}"
        )

    return device


@router.post("/{device_id}/approve", response_model=DeviceResponse)
async def approve_device(
    device_id: int,
    approval: DeviceApproval,
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    client_info = get_client_info(request)

    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()

    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    if device.status == DeviceStatus.TRUSTED:
        raise HTTPException(status_code=400, detail="Device already trusted")

    old_status = device.status

    if approval.approve:
        device.status = DeviceStatus.TRUSTED
        device.approved_by = current_user.id
        device.approved_at = datetime.utcnow()
        event_type = SecurityEventType.DEVICE_APPROVED
        severity = SecurityEventSeverity.INFO
        description = f"Device approved by admin {current_user.username}"
    else:
        device.status = DeviceStatus.REVOKED
        device.revoked_by = current_user.id
        device.revoked_at = datetime.utcnow()
        device.revoked_reason = approval.reason or "Rejected by admin"
        event_type = SecurityEventType.DEVICE_REVOKED
        severity = SecurityEventSeverity.MEDIUM
        description = f"Device rejected by admin {current_user.username}"

    device.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(device)

    from app.routers.auth import create_security_event, create_audit_log
    await create_security_event(
        db, event_type, severity,
        "Device status changed",
        description,
        user_id=device.owner_id, device_id=device.id,
        ip_address=client_info["ip"], user_agent=client_info["user_agent"]
    )

    await create_audit_log(
        db, AuditAction.APPROVE if approval.approve else AuditAction.REVOKE,
        AuditResourceType.DEVICE,
        resource_id=str(device.id), resource_name=device.name,
        user_id=current_user.id, ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
        old_values={"status": old_status.value}, new_values={"status": device.status.value},
        changed_fields=["status"],
        description=description
    )

    return device


@router.post("/{device_id}/revoke", response_model=DeviceResponse)
async def revoke_device(
    device_id: int,
    request: Request,
    reason: Optional[str] = None,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    client_info = get_client_info(request)

    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()

    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    if device.status == DeviceStatus.REVOKED:
        raise HTTPException(status_code=400, detail="Device already revoked")

    old_status = device.status
    device.status = DeviceStatus.REVOKED
    device.revoked_by = current_user.id
    device.revoked_at = datetime.utcnow()
    device.revoked_reason = reason or "Revoked by admin"
    device.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(device)

    # Revoke all active sessions for this device
    from app.models.session import LoginSession, SessionStatus
    sessions_result = await db.execute(
        select(LoginSession).where(
            LoginSession.device_id == device.id,
            LoginSession.status == SessionStatus.ACTIVE
        )
    )
    sessions = sessions_result.scalars().all()
    for session in sessions:
        session.status = SessionStatus.REVOKED
        session.revoked_at = datetime.utcnow()
        session.revoked_reason = f"Device revoked: {device.revoked_reason}"
    await db.commit()

    from app.routers.auth import create_security_event, create_audit_log
    await create_security_event(
        db, SecurityEventType.DEVICE_REVOKED, SecurityEventSeverity.HIGH,
        "Device revoked",
        f"Device {device.name} revoked by admin {current_user.username}: {device.revoked_reason}",
        user_id=device.owner_id, device_id=device.id,
        ip_address=client_info["ip"], user_agent=client_info["user_agent"],
        risk_score=70
    )

    await create_audit_log(
        db, AuditAction.REVOKE, AuditResourceType.DEVICE,
        resource_id=str(device.id), resource_name=device.name,
        user_id=current_user.id, ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
        old_values={"status": old_status.value}, new_values={"status": device.status.value},
        changed_fields=["status"],
        description=f"Admin {current_user.username} revoked device {device.name}"
    )

    return device


@router.get("/{device_id}/trust-assessment")
async def get_device_trust_assessment(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Device).where(Device.id == device_id))
    device = result.scalar_one_or_none()

    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    if current_user.role != UserRole.ADMIN and device.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    from app.services.zero_trust import calculate_device_trust_score
    assessment = await calculate_device_trust_score(device, db)

    return assessment