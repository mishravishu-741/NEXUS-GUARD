from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc, and_
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.threat_alert import ThreatAlert, ThreatType, ThreatSeverity, ThreatStatus
from app.models.user import User, UserRole
from app.schemas.threat_alert import ThreatAlertResponse, ThreatAlertListResponse, ThreatAlertUpdate, ThreatAlertFilter, ThreatAlertStats
from app.routers.dependencies import get_current_user, get_current_admin_user, get_client_info
from app.routers.auth import create_audit_log
from app.models.audit_log import AuditAction, AuditResourceType

router = APIRouter(prefix="/threat-alerts", tags=["Threat Alerts"])


@router.get("", response_model=ThreatAlertListResponse)
async def list_threat_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    threat_type: Optional[ThreatType] = None,
    severity: Optional[ThreatSeverity] = None,
    status: Optional[ThreatStatus] = None,
    user_id: Optional[int] = None,
    device_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    assigned_to: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(ThreatAlert)

    # Non-admin users can only see alerts related to them
    if current_user.role != UserRole.ADMIN:
        query = query.where(
            or_(
                ThreatAlert.user_id == current_user.id,
                ThreatAlert.assigned_to == current_user.id
            )
        )
    elif user_id:
        query = query.where(ThreatAlert.user_id == user_id)

    if threat_type:
        query = query.where(ThreatAlert.threat_type == threat_type)

    if severity:
        query = query.where(ThreatAlert.severity == severity)

    if status:
        query = query.where(ThreatAlert.status == status)

    if device_id:
        query = query.where(ThreatAlert.device_id == device_id)

    if ip_address:
        query = query.where(ThreatAlert.ip_address == ip_address)

    if assigned_to:
        query = query.where(ThreatAlert.assigned_to == assigned_to)

    if start_date:
        query = query.where(ThreatAlert.first_detected >= start_date)

    if end_date:
        query = query.where(ThreatAlert.first_detected <= end_date)

    if search:
        query = query.where(
            or_(
                ThreatAlert.title.ilike(f"%{search}%"),
                ThreatAlert.description.ilike(f"%{search}%")
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(desc(ThreatAlert.first_detected))

    result = await db.execute(query)
    alerts = result.scalars().all()

    return ThreatAlertListResponse(
        alerts=alerts,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{alert_id}", response_model=ThreatAlertResponse)
async def get_threat_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(ThreatAlert).where(ThreatAlert.id == alert_id))
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Threat alert not found")

    if current_user.role != UserRole.ADMIN and alert.user_id != current_user.id and alert.assigned_to != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this alert")

    return alert


@router.patch("/{alert_id}", response_model=ThreatAlertResponse)
async def update_threat_alert(
    alert_id: int,
    alert_data: ThreatAlertUpdate,
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    client_info = get_client_info(request)

    result = await db.execute(select(ThreatAlert).where(ThreatAlert.id == alert_id))
    alert = result.scalar_one_or_none()

    if not alert:
        raise HTTPException(status_code=404, detail="Threat alert not found")

    old_values = {
        "status": alert.status.value,
        "assigned_to": alert.assigned_to,
        "resolution_notes": alert.resolution_notes,
        "mitigation_actions": alert.mitigation_actions
    }

    update_data = alert_data.model_dump(exclude_unset=True)
    changed_fields = []

    for field, value in update_data.items():
        if getattr(alert, field) != value:
            changed_fields.append(field)
            setattr(alert, field, value)

    if changed_fields:
        alert.updated_at = datetime.utcnow()
        if alert_data.status in [ThreatStatus.MITIGATED, ThreatStatus.CLOSED, ThreatStatus.FALSE_POSITIVE] and not alert.resolved_at:
            alert.resolved_by = current_user.id
            alert.resolved_at = datetime.utcnow()
        await db.commit()
        await db.refresh(alert)

        new_values = {field: getattr(alert, field) for field in changed_fields}

        await create_audit_log(
            db, AuditAction.UPDATE, AuditResourceType.THREAT_ALERT,
            resource_id=str(alert.id), resource_name=alert.title,
            user_id=current_user.id, ip_address=client_info["ip"],
            user_agent=client_info["user_agent"],
            old_values=old_values, new_values=new_values,
            changed_fields=changed_fields,
            description=f"Admin {current_user.username} updated threat alert {alert.title}"
        )

    return alert


@router.get("/stats/summary", response_model=ThreatAlertStats)
async def get_threat_alert_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    base_query = select(ThreatAlert)
    if current_user.role != UserRole.ADMIN:
        base_query = base_query.where(
            or_(
                ThreatAlert.user_id == current_user.id,
                ThreatAlert.assigned_to == current_user.id
            )
        )

    # Total alerts
    total_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total_alerts = total_result.scalar() or 0

    # By severity
    severity_result = await db.execute(
        select(ThreatAlert.severity, func.count())
        .select_from(base_query.subquery())
        .group_by(ThreatAlert.severity)
    )
    by_severity = {row[0].value: row[1] for row in severity_result.all()}

    # By type
    type_result = await db.execute(
        select(ThreatAlert.threat_type, func.count())
        .select_from(base_query.subquery())
        .group_by(ThreatAlert.threat_type)
    )
    by_type = {row[0].value: row[1] for row in type_result.all()}

    # By status
    status_result = await db.execute(
        select(ThreatAlert.status, func.count())
        .select_from(base_query.subquery())
        .group_by(ThreatAlert.status)
    )
    by_status = {row[0].value: row[1] for row in status_result.all()}

    # Open count
    open_result = await db.execute(
        select(func.count()).select_from(base_query.where(ThreatAlert.status == ThreatStatus.OPEN).subquery())
    )
    open_count = open_result.scalar() or 0

    # Critical/High counts
    critical_result = await db.execute(
        select(func.count()).select_from(base_query.where(ThreatAlert.severity == ThreatSeverity.CRITICAL).subquery())
    )
    critical_count = critical_result.scalar() or 0

    high_result = await db.execute(
        select(func.count()).select_from(base_query.where(ThreatAlert.severity == ThreatSeverity.HIGH).subquery())
    )
    high_count = high_result.scalar() or 0

    # Time-based counts
    now = datetime.utcnow()
    last_24h_result = await db.execute(
        select(func.count()).select_from(base_query.where(ThreatAlert.first_detected >= now - timedelta(hours=24)).subquery())
    )
    last_24h = last_24h_result.scalar() or 0

    last_7d_result = await db.execute(
        select(func.count()).select_from(base_query.where(ThreatAlert.first_detected >= now - timedelta(days=7)).subquery())
    )
    last_7d = last_7d_result.scalar() or 0

    last_30d_result = await db.execute(
        select(func.count()).select_from(base_query.where(ThreatAlert.first_detected >= now - timedelta(days=30)).subquery())
    )
    last_30d = last_30d_result.scalar() or 0

    return ThreatAlertStats(
        total_alerts=total_alerts,
        by_severity=by_severity,
        by_type=by_type,
        by_status=by_status,
        open_count=open_count,
        critical_count=critical_count,
        high_count=high_count,
        last_24h=last_24h,
        last_7d=last_7d,
        last_30d=last_30d
    )