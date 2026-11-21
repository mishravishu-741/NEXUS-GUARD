from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc, and_, case
from typing import List, Dict, Any
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.user import User, UserRole
from app.models.device import Device, DeviceStatus
from app.models.security_event import SecurityEvent, SecurityEventType, SecurityEventSeverity
from app.models.threat_alert import ThreatAlert, ThreatSeverity, ThreatStatus
from app.models.access_decision import AccessDecision, AccessDecisionType
from app.models.audit_log import AuditLog, AuditAction
from app.schemas.dashboard import (
    DashboardStats, DashboardCharts, RecentActivity, ThreatAnalytics,
    AccessDecisionAnalytics, DeviceAnalytics, ChartDataPoint
)
from app.routers.dependencies import get_current_user, get_current_admin_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # User stats
    if current_user.role == UserRole.ADMIN:
        total_users_result = await db.execute(select(func.count(User.id)))
        active_users_result = await db.execute(select(func.count(User.id)).where(User.is_active == True))
        total_devices_result = await db.execute(select(func.count(Device.id)))
        trusted_devices_result = await db.execute(select(func.count(Device.id)).where(Device.status == DeviceStatus.TRUSTED))
        untrusted_devices_result = await db.execute(select(func.count(Device.id)).where(Device.status == DeviceStatus.UNTRUSTED))
        pending_devices_result = await db.execute(select(func.count(Device.id)).where(Device.status == DeviceStatus.PENDING))
    else:
        total_users_result = await db.execute(select(func.count(User.id)).where(User.id == current_user.id))
        active_users_result = await db.execute(select(func.count(User.id)).where(User.id == current_user.id, User.is_active == True))
        total_devices_result = await db.execute(select(func.count(Device.id)).where(Device.owner_id == current_user.id))
        trusted_devices_result = await db.execute(select(func.count(Device.id)).where(Device.owner_id == current_user.id, Device.status == DeviceStatus.TRUSTED))
        untrusted_devices_result = await db.execute(select(func.count(Device.id)).where(Device.owner_id == current_user.id, Device.status == DeviceStatus.UNTRUSTED))
        pending_devices_result = await db.execute(select(func.count(Device.id)).where(Device.owner_id == current_user.id, Device.status == DeviceStatus.PENDING))

    # Security events last 24h
    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)

    if current_user.role == UserRole.ADMIN:
        security_events_24h_result = await db.execute(
            select(func.count(SecurityEvent.id)).where(SecurityEvent.created_at >= last_24h)
        )
        critical_alerts_result = await db.execute(
            select(func.count(ThreatAlert.id)).where(
                ThreatAlert.severity == ThreatSeverity.CRITICAL,
                ThreatAlert.status.in_([ThreatStatus.OPEN, ThreatStatus.INVESTIGATING])
            )
        )
        high_alerts_result = await db.execute(
            select(func.count(ThreatAlert.id)).where(
                ThreatAlert.severity == ThreatSeverity.HIGH,
                ThreatAlert.status.in_([ThreatStatus.OPEN, ThreatStatus.INVESTIGATING])
            )
        )
        open_alerts_result = await db.execute(
            select(func.count(ThreatAlert.id)).where(ThreatAlert.status == ThreatStatus.OPEN)
        )
    else:
        security_events_24h_result = await db.execute(
            select(func.count(SecurityEvent.id)).where(
                SecurityEvent.user_id == current_user.id,
                SecurityEvent.created_at >= last_24h
            )
        )
        critical_alerts_result = await db.execute(
            select(func.count(ThreatAlert.id)).where(
                ThreatAlert.user_id == current_user.id,
                ThreatAlert.severity == ThreatSeverity.CRITICAL,
                ThreatAlert.status.in_([ThreatStatus.OPEN, ThreatStatus.INVESTIGATING])
            )
        )
        high_alerts_result = await db.execute(
            select(func.count(ThreatAlert.id)).where(
                ThreatAlert.user_id == current_user.id,
                ThreatAlert.severity == ThreatSeverity.HIGH,
                ThreatAlert.status.in_([ThreatStatus.OPEN, ThreatStatus.INVESTIGATING])
            )
        )
        open_alerts_result = await db.execute(
            select(func.count(ThreatAlert.id)).where(
                ThreatAlert.user_id == current_user.id,
                ThreatAlert.status == ThreatStatus.OPEN
            )
        )

    # Access decisions last 24h
    if current_user.role == UserRole.ADMIN:
        access_decisions_24h_result = await db.execute(
            select(func.count(AccessDecision.id)).where(AccessDecision.created_at >= last_24h)
        )
        allow_decisions_result = await db.execute(
            select(func.count(AccessDecision.id)).where(
                AccessDecision.decision == AccessDecisionType.ALLOW,
                AccessDecision.created_at >= last_24h
            )
        )
        deny_decisions_result = await db.execute(
            select(func.count(AccessDecision.id)).where(
                AccessDecision.decision == AccessDecisionType.DENY,
                AccessDecision.created_at >= last_24h
            )
        )
        challenge_decisions_result = await db.execute(
            select(func.count(AccessDecision.id)).where(
                AccessDecision.decision == AccessDecisionType.CHALLENGE,
                AccessDecision.created_at >= last_24h
            )
        )
    else:
        access_decisions_24h_result = await db.execute(
            select(func.count(AccessDecision.id)).where(
                AccessDecision.user_id == current_user.id,
                AccessDecision.created_at >= last_24h
            )
        )
        allow_decisions_result = await db.execute(
            select(func.count(AccessDecision.id)).where(
                AccessDecision.user_id == current_user.id,
                AccessDecision.decision == AccessDecisionType.ALLOW,
                AccessDecision.created_at >= last_24h
            )
        )
        deny_decisions_result = await db.execute(
            select(func.count(AccessDecision.id)).where(
                AccessDecision.user_id == current_user.id,
                AccessDecision.decision == AccessDecisionType.DENY,
                AccessDecision.created_at >= last_24h
            )
        )
        challenge_decisions_result = await db.execute(
            select(func.count(AccessDecision.id)).where(
                AccessDecision.user_id == current_user.id,
                AccessDecision.decision == AccessDecisionType.CHALLENGE,
                AccessDecision.created_at >= last_24h
            )
        )

    return DashboardStats(
        total_users=total_users_result.scalar() or 0,
        active_users=active_users_result.scalar() or 0,
        total_devices=total_devices_result.scalar() or 0,
        trusted_devices=trusted_devices_result.scalar() or 0,
        untrusted_devices=untrusted_devices_result.scalar() or 0,
        pending_devices=pending_devices_result.scalar() or 0,
        security_events_24h=security_events_24h_result.scalar() or 0,
        critical_alerts=critical_alerts_result.scalar() or 0,
        high_alerts=high_alerts_result.scalar() or 0,
        open_alerts=open_alerts_result.scalar() or 0,
        access_decisions_24h=access_decisions_24h_result.scalar() or 0,
        allow_decisions=allow_decisions_result.scalar() or 0,
        deny_decisions=deny_decisions_result.scalar() or 0,
        challenge_decisions=challenge_decisions_result.scalar() or 0
    )


@router.get("/charts", response_model=DashboardCharts)
async def get_dashboard_charts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Build base queries based on user role
    if current_user.role == UserRole.ADMIN:
        events_base = select(SecurityEvent)
        alerts_base = select(ThreatAlert)
        decisions_base = select(AccessDecision)
        devices_base = select(Device)
    else:
        events_base = select(SecurityEvent).where(SecurityEvent.user_id == current_user.id)
        alerts_base = select(ThreatAlert).where(ThreatAlert.user_id == current_user.id)
        decisions_base = select(AccessDecision).where(AccessDecision.user_id == current_user.id)
        devices_base = select(Device).where(Device.owner_id == current_user.id)

    # Events by severity
    events_severity_result = await db.execute(
        select(SecurityEvent.severity, func.count())
        .select_from(events_base.subquery())
        .group_by(SecurityEvent.severity)
    )
    events_by_severity = [
        ChartDataPoint(label=row[0].value.capitalize(), value=row[1])
        for row in events_severity_result.all()
    ]

    # Events by type (top 10)
    events_type_result = await db.execute(
        select(SecurityEvent.event_type, func.count())
        .select_from(events_base.subquery())
        .group_by(SecurityEvent.event_type)
        .order_by(desc(func.count()))
        .limit(10)
    )
    events_by_type = [
        ChartDataPoint(label=row[0].value.replace("_", " ").title(), value=row[1])
        for row in events_type_result.all()
    ]

    # Alerts by severity
    alerts_severity_result = await db.execute(
        select(ThreatAlert.severity, func.count())
        .select_from(alerts_base.subquery())
        .group_by(ThreatAlert.severity)
    )
    alerts_by_severity = [
        ChartDataPoint(label=row[0].value.capitalize(), value=row[1])
        for row in alerts_severity_result.all()
    ]

    # Alerts by type (top 10)
    alerts_type_result = await db.execute(
        select(ThreatAlert.threat_type, func.count())
        .select_from(alerts_base.subquery())
        .group_by(ThreatAlert.threat_type)
        .order_by(desc(func.count()))
        .limit(10)
    )
    alerts_by_type = [
        ChartDataPoint(label=row[0].value.replace("_", " ").title(), value=row[1])
        for row in alerts_type_result.all()
    ]

    # Access decisions
    decisions_result = await db.execute(
        select(AccessDecision.decision, func.count())
        .select_from(decisions_base.subquery())
        .group_by(AccessDecision.decision)
    )
    access_decisions = [
        ChartDataPoint(label=row[0].value.capitalize(), value=row[1])
        for row in decisions_result.all()
    ]

    # Device trust distribution
    trust_ranges = [
        (0, 20, "0-20"),
        (21, 40, "21-40"),
        (41, 60, "41-60"),
        (61, 80, "61-80"),
        (81, 100, "81-100")
    ]
    device_trust_distribution = []
    for min_t, max_t, label in trust_ranges:
        count_result = await db.execute(
            select(func.count()).select_from(
                devices_base.where(
                    and_(Device.trust_score >= min_t, Device.trust_score <= max_t)
                ).subquery()
            )
        )
        device_trust_distribution.append(ChartDataPoint(label=label, value=count_result.scalar() or 0))

    # Login trends (last 7 days)
    login_trends = []
    for i in range(6, -1, -1):
        day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        count_result = await db.execute(
            select(func.count()).select_from(
                events_base.where(
                    and_(
                        SecurityEvent.event_type == SecurityEventType.LOGIN_SUCCESS,
                        SecurityEvent.created_at >= day_start,
                        SecurityEvent.created_at < day_end
                    )
                ).subquery()
            )
        )
        login_trends.append(ChartDataPoint(label=day_start.strftime("%a"), value=count_result.scalar() or 0))

    # Threat trends (last 7 days)
    threat_trends = []
    for i in range(6, -1, -1):
        day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        count_result = await db.execute(
            select(func.count()).select_from(
                alerts_base.where(
                    and_(
                        ThreatAlert.first_detected >= day_start,
                        ThreatAlert.first_detected < day_end
                    )
                ).subquery()
            )
        )
        threat_trends.append(ChartDataPoint(label=day_start.strftime("%a"), value=count_result.scalar() or 0))

    return DashboardCharts(
        events_by_severity=events_by_severity,
        events_by_type=events_by_type,
        alerts_by_severity=alerts_by_severity,
        alerts_by_type=alerts_by_type,
        access_decisions=access_decisions,
        device_trust_distribution=device_trust_distribution,
        login_trends=login_trends,
        threat_trends=threat_trends
    )


@router.get("/recent-activity", response_model=List[RecentActivity])
async def get_recent_activity(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role == UserRole.ADMIN:
        events_query = select(SecurityEvent).order_by(desc(SecurityEvent.created_at)).limit(limit)
    else:
        events_query = select(SecurityEvent).where(
            SecurityEvent.user_id == current_user.id
        ).order_by(desc(SecurityEvent.created_at)).limit(limit)

    result = await db.execute(events_query)
    events = result.scalars().all()

    activities = []
    for event in events:
        user_name = None
        device_name = None
        if event.user_id:
            user_result = await db.execute(select(User.username).where(User.id == event.user_id))
            user_name = user_result.scalar()
        if event.device_id:
            from app.models.device import Device
            device_result = await db.execute(select(Device.name).where(Device.id == event.device_id))
            device_name = device_result.scalar()

        activities.append(RecentActivity(
            id=event.id,
            type=event.event_type.value,
            title=event.title,
            description=event.description,
            severity=event.severity.value,
            user=user_name,
            device=device_name,
            ip=event.ip_address,
            timestamp=event.created_at
        ))

    return activities


@router.get("/threat-analytics", response_model=ThreatAnalytics)
async def get_threat_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role == UserRole.ADMIN:
        alerts_base = select(ThreatAlert)
    else:
        alerts_base = select(ThreatAlert).where(ThreatAlert.user_id == current_user.id)

    # Total threats
    total_result = await db.execute(select(func.count()).select_from(alerts_base.subquery()))
    total_threats = total_result.scalar() or 0

    # By severity
    severity_result = await db.execute(
        select(ThreatAlert.severity, func.count())
        .select_from(alerts_base.subquery())
        .group_by(ThreatAlert.severity)
    )
    by_severity = {row[0].value: row[1] for row in severity_result.all()}

    # By type
    type_result = await db.execute(
        select(ThreatAlert.threat_type, func.count())
        .select_from(alerts_base.subquery())
        .group_by(ThreatAlert.threat_type)
        .order_by(desc(func.count()))
        .limit(10)
    )
    by_type = {row[0].value: row[1] for row in type_result.all()}

    # By status
    status_result = await db.execute(
        select(ThreatAlert.status, func.count())
        .select_from(alerts_base.subquery())
        .group_by(ThreatAlert.status)
    )
    by_status = {row[0].value: row[1] for row in status_result.all()}

    # Top threats
    top_threats_result = await db.execute(
        select(ThreatAlert).select_from(alerts_base.subquery())
        .order_by(desc(ThreatAlert.risk_score), desc(ThreatAlert.first_detected))
        .limit(5)
    )
    top_threats = []
    for alert in top_threats_result.scalars().all():
        top_threats.append({
            "id": alert.id,
            "title": alert.title,
            "type": alert.threat_type.value,
            "severity": alert.severity.value,
            "risk_score": alert.risk_score,
            "status": alert.status.value,
            "detected": alert.first_detected.isoformat()
        })

    # Detection trends (last 30 days)
    detection_trends = []
    for i in range(29, -1, -1):
        day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        count_result = await db.execute(
            select(func.count()).select_from(
                alerts_base.where(
                    and_(
                        ThreatAlert.first_detected >= day_start,
                        ThreatAlert.first_detected < day_end
                    )
                ).subquery()
            )
        )
        detection_trends.append(ChartDataPoint(label=day_start.strftime("%m/%d"), value=count_result.scalar() or 0))

    return ThreatAnalytics(
        total_threats=total_threats,
        by_severity=by_severity,
        by_type=by_type,
        by_status=by_status,
        top_threats=top_threats,
        detection_trends=detection_trends
    )


@router.get("/access-decision-analytics", response_model=AccessDecisionAnalytics)
async def get_access_decision_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role == UserRole.ADMIN:
        decisions_base = select(AccessDecision)
    else:
        decisions_base = select(AccessDecision).where(AccessDecision.user_id == current_user.id)

    # Total decisions
    total_result = await db.execute(select(func.count()).select_from(decisions_base.subquery()))
    total_decisions = total_result.scalar() or 0

    # By decision
    decision_result = await db.execute(
        select(AccessDecision.decision, func.count())
        .select_from(decisions_base.subquery())
        .group_by(AccessDecision.decision)
    )
    by_decision = {row[0].value: row[1] for row in decision_result.all()}

    # By risk level
    risk_ranges = [
        (0, 20, "Low (0-20)"),
        (21, 50, "Medium (21-50)"),
        (51, 80, "High (51-80)"),
        (81, 100, "Critical (81-100)")
    ]
    by_risk_level = {}
    for min_r, max_r, label in risk_ranges:
        count_result = await db.execute(
            select(func.count()).select_from(
                decisions_base.where(
                    and_(AccessDecision.risk_score >= min_r, AccessDecision.risk_score <= max_r)
                ).subquery()
            )
        )
        by_risk_level[label] = count_result.scalar() or 0

    # MFA challenges
    mfa_challenges_result = await db.execute(
        select(func.count()).select_from(
            decisions_base.where(AccessDecision.mfa_required == True).subquery()
        )
    )
    mfa_challenges = mfa_challenges_result.scalar() or 0

    mfa_success_result = await db.execute(
        select(func.count()).select_from(
            decisions_base.where(
                and_(AccessDecision.mfa_required == True, AccessDecision.mfa_verified == True)
            ).subquery()
        )
    )
    mfa_success = mfa_success_result.scalar() or 0
    mfa_success_rate = (mfa_success / mfa_challenges * 100) if mfa_challenges > 0 else 0

    # Decision trends (last 7 days)
    decision_trends = []
    for i in range(6, -1, -1):
        day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        count_result = await db.execute(
            select(func.count()).select_from(
                decisions_base.where(
                    and_(
                        AccessDecision.created_at >= day_start,
                        AccessDecision.created_at < day_end
                    )
                ).subquery()
            )
        )
        decision_trends.append(ChartDataPoint(label=day_start.strftime("%a"), value=count_result.scalar() or 0))

    return AccessDecisionAnalytics(
        total_decisions=total_decisions,
        by_decision=by_decision,
        by_risk_level=by_risk_level,
        mfa_challenges=mfa_challenges,
        mfa_success_rate=round(mfa_success_rate, 2),
        decision_trends=decision_trends
    )


@router.get("/device-analytics", response_model=DeviceAnalytics)
async def get_device_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role == UserRole.ADMIN:
        devices_base = select(Device)
    else:
        devices_base = select(Device).where(Device.owner_id == current_user.id)

    # Total devices
    total_result = await db.execute(select(func.count()).select_from(devices_base.subquery()))
    total_devices = total_result.scalar() or 0

    # By status
    status_result = await db.execute(
        select(Device.status, func.count())
        .select_from(devices_base.subquery())
        .group_by(Device.status)
    )
    by_status = {row[0].value: row[1] for row in status_result.all()}

    # By type
    type_result = await db.execute(
        select(Device.device_type, func.count())
        .select_from(devices_base.subquery())
        .group_by(Device.device_type)
    )
    by_type = {row[0].value: row[1] for row in type_result.all()}

    # Average trust/risk scores
    avg_trust_result = await db.execute(
        select(func.avg(Device.trust_score)).select_from(devices_base.subquery())
    )
    avg_trust_score = round(avg_trust_result.scalar() or 0, 2)

    avg_risk_result = await db.execute(
        select(func.avg(Device.risk_score)).select_from(devices_base.subquery())
    )
    avg_risk_score = round(avg_risk_result.scalar() or 0, 2)

    # Trust distribution
    trust_ranges = [
        (0, 20, "0-20"),
        (21, 40, "21-40"),
        (41, 60, "41-60"),
        (61, 80, "61-80"),
        (81, 100, "81-100")
    ]
    trust_distribution = []
    for min_t, max_t, label in trust_ranges:
        count_result = await db.execute(
            select(func.count()).select_from(
                devices_base.where(
                    and_(Device.trust_score >= min_t, Device.trust_score <= max_t)
                ).subquery()
            )
        )
        trust_distribution.append(ChartDataPoint(label=label, value=count_result.scalar() or 0))

    # Recent registrations (last 10)
    recent_result = await db.execute(
        select(Device).select_from(devices_base.subquery())
        .order_by(desc(Device.created_at))
        .limit(10)
    )
    recent_registrations = []
    for device in recent_result.scalars().all():
        recent_registrations.append({
            "id": device.id,
            "name": device.name,
            "device_id": device.device_id,
            "type": device.device_type.value,
            "status": device.status.value,
            "trust_score": device.trust_score,
            "created_at": device.created_at.isoformat()
        })

    return DeviceAnalytics(
        total_devices=total_devices,
        by_status=by_status,
        by_type=by_type,
        avg_trust_score=avg_trust_score,
        avg_risk_score=avg_risk_score,
        trust_distribution=trust_distribution,
        recent_registrations=recent_registrations
    )