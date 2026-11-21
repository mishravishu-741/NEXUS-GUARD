from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc, and_
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.security_event import SecurityEvent, SecurityEventType, SecurityEventSeverity
from app.models.user import User, UserRole
from app.schemas.security_event import SecurityEventResponse, SecurityEventListResponse, SecurityEventFilter, SecurityEventStats
from app.routers.dependencies import get_current_user, get_current_admin_user

router = APIRouter(prefix="/security-events", tags=["Security Events"])


@router.get("", response_model=SecurityEventListResponse)
async def list_security_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    event_type: Optional[SecurityEventType] = None,
    severity: Optional[SecurityEventSeverity] = None,
    user_id: Optional[int] = None,
    device_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    is_resolved: Optional[bool] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(SecurityEvent)

    # Non-admin users can only see their own events
    if current_user.role != UserRole.ADMIN:
        query = query.where(SecurityEvent.user_id == current_user.id)
    elif user_id:
        query = query.where(SecurityEvent.user_id == user_id)

    if event_type:
        query = query.where(SecurityEvent.event_type == event_type)

    if severity:
        query = query.where(SecurityEvent.severity == severity)

    if device_id:
        query = query.where(SecurityEvent.device_id == device_id)

    if ip_address:
        query = query.where(SecurityEvent.ip_address == ip_address)

    if is_resolved is not None:
        query = query.where(SecurityEvent.is_resolved == is_resolved)

    if start_date:
        query = query.where(SecurityEvent.created_at >= start_date)

    if end_date:
        query = query.where(SecurityEvent.created_at <= end_date)

    if search:
        query = query.where(
            or_(
                SecurityEvent.title.ilike(f"%{search}%"),
                SecurityEvent.description.ilike(f"%{search}%")
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(desc(SecurityEvent.created_at))

    result = await db.execute(query)
    events = result.scalars().all()

    return SecurityEventListResponse(
        events=events,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{event_id}", response_model=SecurityEventResponse)
async def get_security_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(SecurityEvent).where(SecurityEvent.id == event_id))
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Security event not found")

    if current_user.role != UserRole.ADMIN and event.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this event")

    return event


@router.get("/stats/summary", response_model=SecurityEventStats)
async def get_security_event_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    base_query = select(SecurityEvent)
    if current_user.role != UserRole.ADMIN:
        base_query = base_query.where(SecurityEvent.user_id == current_user.id)

    # Total events
    total_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total_events = total_result.scalar() or 0

    # By severity
    severity_result = await db.execute(
        select(SecurityEvent.severity, func.count())
        .select_from(base_query.subquery())
        .group_by(SecurityEvent.severity)
    )
    by_severity = {row[0].value: row[1] for row in severity_result.all()}

    # By type
    type_result = await db.execute(
        select(SecurityEvent.event_type, func.count())
        .select_from(base_query.subquery())
        .group_by(SecurityEvent.event_type)
    )
    by_type = {row[0].value: row[1] for row in type_result.all()}

    # Resolved/Unresolved
    resolved_result = await db.execute(
        select(func.count()).select_from(base_query.where(SecurityEvent.is_resolved == True).subquery())
    )
    resolved_count = resolved_result.scalar() or 0
    unresolved_count = total_events - resolved_count

    # Time-based counts
    now = datetime.utcnow()
    last_24h_result = await db.execute(
        select(func.count()).select_from(base_query.where(SecurityEvent.created_at >= now - timedelta(hours=24)).subquery())
    )
    last_24h = last_24h_result.scalar() or 0

    last_7d_result = await db.execute(
        select(func.count()).select_from(base_query.where(SecurityEvent.created_at >= now - timedelta(days=7)).subquery())
    )
    last_7d = last_7d_result.scalar() or 0

    last_30d_result = await db.execute(
        select(func.count()).select_from(base_query.where(SecurityEvent.created_at >= now - timedelta(days=30)).subquery())
    )
    last_30d = last_30d_result.scalar() or 0

    return SecurityEventStats(
        total_events=total_events,
        by_severity=by_severity,
        by_type=by_type,
        resolved_count=resolved_count,
        unresolved_count=unresolved_count,
        last_24h=last_24h,
        last_7d=last_7d,
        last_30d=last_30d
    )


@router.post("/{event_id}/resolve")
async def resolve_security_event(
    event_id: int,
    request: Request,
    resolution_notes: Optional[str] = None,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    from app.routers.dependencies import get_client_info
    client_info = get_client_info(request)

    result = await db.execute(select(SecurityEvent).where(SecurityEvent.id == event_id))
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(status_code=404, detail="Security event not found")

    if event.is_resolved:
        raise HTTPException(status_code=400, detail="Event already resolved")

    event.is_resolved = True
    event.resolved_by = current_user.id
    event.resolved_at = datetime.utcnow()
    event.resolution_notes = resolution_notes
    await db.commit()

    from app.routers.auth import create_audit_log
    from app.models.audit_log import AuditLog, AuditAction, AuditResourceType
    await create_audit_log(
        db, AuditAction.UPDATE, AuditResourceType.SECURITY_EVENT,
        resource_id=str(event.id), resource_name=event.title,
        user_id=current_user.id, ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
        description=f"Admin {current_user.username} resolved security event {event.title}"
    )

    return {"message": "Security event resolved successfully"}