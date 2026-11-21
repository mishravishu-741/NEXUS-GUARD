from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc, and_
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.audit_log import AuditLog, AuditAction, AuditResourceType
from app.models.user import User
from app.schemas.audit_log import AuditLogResponse, AuditLogListResponse, AuditLogFilter, AuditLogStats
from app.routers.dependencies import get_current_user, get_current_admin_user

router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=AuditLogListResponse)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    action: Optional[AuditAction] = None,
    resource_type: Optional[AuditResourceType] = None,
    resource_id: Optional[str] = None,
    user_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    success: Optional[bool] = None,
    correlation_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(AuditLog)

    if action:
        query = query.where(AuditLog.action == action)

    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)

    if resource_id:
        query = query.where(AuditLog.resource_id == resource_id)

    if user_id:
        query = query.where(AuditLog.user_id == user_id)

    if ip_address:
        query = query.where(AuditLog.ip_address == ip_address)

    if success is not None:
        query = query.where(AuditLog.success == success)

    if correlation_id:
        query = query.where(AuditLog.correlation_id == correlation_id)

    if start_date:
        query = query.where(AuditLog.created_at >= start_date)

    if end_date:
        query = query.where(AuditLog.created_at <= end_date)

    if search:
        query = query.where(
            or_(
                AuditLog.description.ilike(f"%{search}%"),
                AuditLog.resource_name.ilike(f"%{search}%"),
                AuditLog.error_message.ilike(f"%{search}%")
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(desc(AuditLog.created_at))

    result = await db.execute(query)
    logs = result.scalars().all()

    return AuditLogListResponse(
        logs=logs,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{log_id}", response_model=AuditLogResponse)
async def get_audit_log(
    log_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(AuditLog).where(AuditLog.id == log_id))
    log = result.scalar_one_or_none()

    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")

    return log


@router.get("/stats/summary", response_model=AuditLogStats)
async def get_audit_log_stats(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    # Total logs
    total_result = await db.execute(select(func.count(AuditLog.id)))
    total_logs = total_result.scalar() or 0

    # By action
    action_result = await db.execute(
        select(AuditLog.action, func.count())
        .group_by(AuditLog.action)
    )
    by_action = {row[0].value: row[1] for row in action_result.all()}

    # By resource type
    resource_result = await db.execute(
        select(AuditLog.resource_type, func.count())
        .group_by(AuditLog.resource_type)
    )
    by_resource_type = {row[0].value: row[1] for row in resource_result.all()}

    # Success/Failure
    success_result = await db.execute(
        select(func.count()).where(AuditLog.success == True)
    )
    success_count = success_result.scalar() or 0

    failure_result = await db.execute(
        select(func.count()).where(AuditLog.success == False)
    )
    failure_count = failure_result.scalar() or 0

    # Time-based counts
    now = datetime.utcnow()
    last_24h_result = await db.execute(
        select(func.count()).where(AuditLog.created_at >= now - timedelta(hours=24))
    )
    last_24h = last_24h_result.scalar() or 0

    last_7d_result = await db.execute(
        select(func.count()).where(AuditLog.created_at >= now - timedelta(days=7))
    )
    last_7d = last_7d_result.scalar() or 0

    last_30d_result = await db.execute(
        select(func.count()).where(AuditLog.created_at >= now - timedelta(days=30))
    )
    last_30d = last_30d_result.scalar() or 0

    return AuditLogStats(
        total_logs=total_logs,
        by_action=by_action,
        by_resource_type=by_resource_type,
        success_count=success_count,
        failure_count=failure_count,
        last_24h=last_24h,
        last_7d=last_7d,
        last_30d=last_30d
    )