from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
import hashlib
import json

from app.models.device import Device, DeviceStatus, DeviceType
from app.models.policy import Policy, PolicyType, PolicyAction, PolicyEvaluation
from app.models.security_event import SecurityEvent, SecurityEventType, SecurityEventSeverity
from app.models.threat_alert import ThreatAlert, ThreatType, ThreatSeverity, ThreatStatus
from app.models.access_decision import AccessDecision, AccessDecisionType
from app.models.user import User
from app.schemas.device import DeviceTrustAssessment
from app.schemas.policy import PolicyEvaluationResponse
from app.schemas.access_decision import AccessDecisionResponse
from app.core.config import settings
from app.routers.auth import create_security_event, create_audit_log
from app.models.audit_log import AuditAction, AuditResourceType


class ZeroTrustEngine:
    """
    Zero Trust Security Engine implementing 'Never Trust, Always Verify'
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def verify_identity(self, user_id: int, device_id: Optional[int] = None,
                              ip_address: str = None, user_agent: str = None) -> Dict[str, Any]:
        """
        Verify user identity based on multiple factors
        """
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            return {"verified": False, "reason": "User not found", "risk_score": 100}

        if not user.is_active:
            return {"verified": False, "reason": "User account deactivated", "risk_score": 90}

        risk_factors = []
        risk_score = 0

        # Check recent failed logins
        if user.failed_login_attempts > 0:
            risk_factors.append(f"Recent failed login attempts: {user.failed_login_attempts}")
            risk_score += min(user.failed_login_attempts * 10, 50)

        # Check if account was recently locked
        if user.locked_until and user.locked_until > datetime.utcnow():
            risk_factors.append("Account was recently locked")
            risk_score += 30

        # Device verification
        device_trust = 0
        if device_id:
            device_result = await self.db.execute(select(Device).where(Device.id == device_id))
            device = device_result.scalar_one_or_none()
            if device:
                device_trust = device.trust_score
                if device.status == DeviceStatus.UNTRUSTED:
                    risk_factors.append("Device is untrusted")
                    risk_score += 40
                elif device.status == DeviceStatus.REVOKED:
                    risk_factors.append("Device has been revoked")
                    risk_score += 60
                elif device.status == DeviceStatus.PENDING:
                    risk_factors.append("Device pending approval")
                    risk_score += 20
            else:
                risk_factors.append("Unknown device")
                risk_score += 30
        else:
            risk_factors.append("No device information")
            risk_score += 20

        # IP reputation check (simplified)
        if ip_address:
            ip_risk = await self._check_ip_reputation(ip_address)
            risk_score += ip_risk
            if ip_risk > 0:
                risk_factors.append(f"IP reputation risk: {ip_risk}")

        # Geo-location anomaly detection (simplified)
        if ip_address and user.last_login:
            geo_risk = await self._check_geo_anomaly(user_id, ip_address)
            risk_score += geo_risk
            if geo_risk > 0:
                risk_factors.append(f"Geographic anomaly detected: {geo_risk}")

        risk_score = min(risk_score, 100)
        verified = risk_score < 50

        return {
            "verified": verified,
            "risk_score": risk_score,
            "risk_factors": risk_factors,
            "device_trust": device_trust,
            "user_id": user_id
        }

    async def evaluate_device_trust(self, device: Device) -> DeviceTrustAssessment:
        """
        Evaluate device trust score based on multiple factors
        """
        return await calculate_device_trust_score(device, self.db)

    async def evaluate_policies(self, context: Dict[str, Any]) -> PolicyEvaluationResponse:
        """
        Evaluate all applicable policies for the given context
        """
        return await evaluate_policies(**context, db=self.db)

    async def make_access_decision(self, context: Dict[str, Any]) -> AccessDecisionResponse:
        """
        Make an access decision based on Zero Trust principles
        """
        return await make_access_decision(**context, db=self.db)

    async def _check_ip_reputation(self, ip_address: str) -> int:
        """
        Check IP reputation (simplified - in production, integrate with threat intel)
        """
        # Check for known malicious IPs in threat alerts
        result = await self.db.execute(
            select(func.count(ThreatAlert.id)).where(
                ThreatAlert.ip_address == ip_address,
                ThreatAlert.threat_type.in_([
                    ThreatType.MALICIOUS_IP,
                    ThreatType.TOR_EXIT_NODE,
                    ThreatType.VPN_PROXY,
                    ThreatType.ANONYMOUS_PROXY
                ]),
                ThreatAlert.status.in_([ThreatStatus.OPEN, ThreatStatus.INVESTIGATING])
            )
        )
        count = result.scalar() or 0
        return min(count * 10, 50)

    async def _check_geo_anomaly(self, user_id: int, ip_address: str) -> int:
        """
        Check for impossible travel / geo anomalies
        """
        # Get recent logins for this user
        result = await self.db.execute(
            select(SecurityEvent.ip_address, SecurityEvent.created_at).where(
                SecurityEvent.user_id == user_id,
                SecurityEvent.event_type == SecurityEventType.LOGIN_SUCCESS,
                SecurityEvent.ip_address.is_not(None),
                SecurityEvent.created_at >= datetime.utcnow() - timedelta(hours=24)
            ).order_by(SecurityEvent.created_at.desc())
        )
        recent_logins = result.all()

        if not recent_logins:
            return 0

        # Simple check: if IP changed significantly (in production, use GeoIP)
        # This is a placeholder - real implementation would use GeoIP databases
        last_ip = recent_logins[0][0]
        if last_ip != ip_address:
            # Check if this is a known pattern
            unique_ips = set(login[0] for login in recent_logins)
            if len(unique_ips) > 3:
                return 30  # Many different IPs in short time
            return 15  # IP changed

        return 0


async def calculate_device_trust_score(device: Device, db: AsyncSession) -> DeviceTrustAssessment:
    """
    Calculate device trust score based on multiple factors
    """
    factors = {}
    recommendations = []
    trust_score = 50.0  # Base score
    risk_score = 0.0

    # Factor 1: Device status
    if device.status == DeviceStatus.TRUSTED:
        factors["device_status"] = {"score": 30, "description": "Device is approved and trusted"}
        trust_score += 30
    elif device.status == DeviceStatus.PENDING:
        factors["device_status"] = {"score": -10, "description": "Device pending approval"}
        trust_score -= 10
        risk_score += 20
        recommendations.append("Approve device after verification")
    elif device.status == DeviceStatus.UNTRUSTED:
        factors["device_status"] = {"score": -30, "description": "Device marked as untrusted"}
        trust_score -= 30
        risk_score += 40
        recommendations.append("Investigate device before allowing access")
    elif device.status == DeviceStatus.REVOKED:
        factors["device_status"] = {"score": -50, "description": "Device has been revoked"}
        trust_score -= 50
        risk_score += 60
        recommendations.append("Device access revoked - do not allow")

    # Factor 2: Device age/first seen
    device_age_days = (datetime.utcnow() - device.first_seen).days
    if device_age_days > 90:
        factors["device_age"] = {"score": 10, "description": f"Device known for {device_age_days} days"}
        trust_score += 10
    elif device_age_days > 30:
        factors["device_age"] = {"score": 5, "description": f"Device known for {device_age_days} days"}
        trust_score += 5
    else:
        factors["device_age"] = {"score": 0, "description": f"New device ({device_age_days} days)"}
        risk_score += 10
        recommendations.append("New device - require additional verification")

    # Factor 3: OS and browser info
    if device.os_name and device.browser_name:
        factors["device_fingerprint"] = {"score": 5, "description": "Complete device fingerprint"}
        trust_score += 5
    else:
        factors["device_fingerprint"] = {"score": -5, "description": "Incomplete device fingerprint"}
        risk_score += 10

    # Factor 4: Recent activity
    if device.last_seen:
        days_since_seen = (datetime.utcnow() - device.last_seen).days
        if days_since_seen <= 1:
            factors["recent_activity"] = {"score": 10, "description": "Device recently active"}
            trust_score += 10
        elif days_since_seen <= 7:
            factors["recent_activity"] = {"score": 5, "description": "Device active this week"}
            trust_score += 5
        else:
            factors["recent_activity"] = {"score": -5, "description": f"Device inactive for {days_since_seen} days"}
            risk_score += 10

    # Factor 5: Security events associated with device
    event_result = await db.execute(
        select(func.count(SecurityEvent.id)).where(
            SecurityEvent.device_id == device.id,
            SecurityEvent.severity.in_([SecurityEventSeverity.HIGH, SecurityEventSeverity.CRITICAL]),
            SecurityEvent.created_at >= datetime.utcnow() - timedelta(days=30)
        )
    )
    high_severity_events = event_result.scalar() or 0
    if high_severity_events > 0:
        factors["security_events"] = {"score": -high_severity_events * 5, "description": f"{high_severity_events} high-severity events in 30 days"}
        trust_score -= high_severity_events * 5
        risk_score += high_severity_events * 10
        recommendations.append("Review recent security events for this device")

    # Factor 6: Consistent IP/location
    if device.ip_address:
        ip_result = await db.execute(
            select(func.count(SecurityEvent.id)).where(
                SecurityEvent.device_id == device.id,
                SecurityEvent.ip_address == device.ip_address,
                SecurityEvent.created_at >= datetime.utcnow() - timedelta(days=30)
            )
        )
        same_ip_count = ip_result.scalar() or 0
        total_result = await db.execute(
            select(func.count(SecurityEvent.id)).where(
                SecurityEvent.device_id == device.id,
                SecurityEvent.created_at >= datetime.utcnow() - timedelta(days=30)
            )
        )
        total_events = total_result.scalar() or 1
        consistency = (same_ip_count / total_events) * 100 if total_events > 0 else 0

        if consistency > 80:
            factors["ip_consistency"] = {"score": 10, "description": f"Consistent IP ({consistency:.0f}%)"}
            trust_score += 10
        elif consistency < 50:
            factors["ip_consistency"] = {"score": -10, "description": f"Inconsistent IP ({consistency:.0f}%)"}
            risk_score += 15
            recommendations.append("Device accessing from multiple locations")

    # Clamp scores
    trust_score = max(0, min(100, trust_score))
    risk_score = max(0, min(100, risk_score))

    # Update device
    device.trust_score = trust_score
    device.risk_score = risk_score
    device.updated_at = datetime.utcnow()
    await db.commit()

    return DeviceTrustAssessment(
        device_id=device.device_id,
        trust_score=trust_score,
        risk_score=risk_score,
        factors=factors,
        recommendations=recommendations
    )


async def evaluate_policies(
    user_id: int,
    device_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    location: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    action: Optional[str] = None,
    risk_score: float = 0.0,
    trust_score: float = 0.0,
    db: AsyncSession = None
) -> PolicyEvaluationResponse:
    """
    Evaluate all applicable policies for the given context
    """
    # Get active policies ordered by priority
    result = await db.execute(
        select(Policy).where(
            Policy.is_active == True
        ).order_by(Policy.priority)
    )
    policies = result.scalars().all()

    matched_policies = []
    final_decision = PolicyAction.MONITOR  # Default
    mfa_required = False

    for policy in policies:
        # Check if policy applies to this context
        if not _policy_applies(policy, user_id, device_id, ip_address, resource_type, action, risk_score, trust_score, db):
            continue

        matched_policies.append(policy)

        # Create evaluation record
        evaluation = PolicyEvaluation(
            policy_id=policy.id,
            decision=policy.action,
            matched_conditions={"context": "matched"},
            risk_score=risk_score,
            trust_score=trust_score,
            context={
                "user_id": user_id,
                "device_id": device_id,
                "ip_address": ip_address,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "action": action
            }
        )
        db.add(evaluation)

        # Apply policy action (first match wins based on priority)
        if final_decision == PolicyAction.MONITOR:
            final_decision = policy.action
            if policy.action == PolicyAction.CHALLENGE:
                mfa_required = True

    await db.commit()

    return PolicyEvaluationResponse(
        decision=final_decision,
        matched_policies=matched_policies,
        risk_score=risk_score,
        trust_score=trust_score,
        mfa_required=mfa_required
    )


def _policy_applies(
    policy: Policy,
    user_id: int,
    device_id: Optional[int],
    ip_address: Optional[str],
    resource_type: Optional[str],
    action: Optional[str],
    risk_score: float,
    trust_score: float,
    db: AsyncSession
) -> bool:
    """
    Check if a policy applies to the given context
    """
    # Check risk score range
    if risk_score < policy.min_risk_score or risk_score > policy.max_risk_score:
        return False

    # Check trust score range
    if trust_score < policy.min_trust_score or trust_score > policy.max_trust_score:
        return False

    # Check roles
    if policy.applies_to_roles:
        # Would need to fetch user role - simplified for now
        pass

    # Check devices
    if policy.applies_to_devices and device_id:
        if "all" not in policy.applies_to_devices and str(device_id) not in policy.applies_to_devices:
            return False

    # Check networks (CIDR)
    if policy.applies_to_networks and ip_address:
        # Simplified - would need CIDR matching
        pass

    # Check conditions
    conditions = policy.conditions or {}
    if conditions:
        # Resource type condition
        if "resource_type" in conditions and resource_type:
            if conditions["resource_type"] != resource_type:
                return False

        # Action condition
        if "action" in conditions and action:
            if conditions["action"] != action:
                return False

    return True


async def make_access_decision(
    user_id: int,
    device_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    location: Optional[str] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    action: Optional[str] = None,
    risk_score: float = 0.0,
    trust_score: float = 0.0,
    metadata: Optional[Dict[str, Any]] = None,
    db: AsyncSession = None
) -> AccessDecisionResponse:
    """
    Make a Zero Trust access decision
    """
    # Verify identity
    engine = ZeroTrustEngine(db)
    identity_result = await engine.verify_identity(user_id, device_id, ip_address, user_agent)

    # Combine risk scores
    combined_risk = max(risk_score, identity_result["risk_score"])
    combined_trust = trust_score

    # If device provided, get its trust score
    if device_id:
        device_result = await db.execute(select(Device).where(Device.id == device_id))
        device = device_result.scalar_one_or_none()
        if device:
            combined_trust = device.trust_score

    # Evaluate policies
    policy_result = await evaluate_policies(
        user_id=user_id,
        device_id=device_id,
        ip_address=ip_address,
        user_agent=user_agent,
        location=location,
        resource_type=resource_type,
        resource_id=resource_id,
        action=action,
        risk_score=combined_risk,
        trust_score=combined_trust,
        db=db
    )

    # Make final decision
    final_decision = policy_result.decision
    mfa_required = policy_result.mfa_required

    # Override based on risk/trust thresholds
    if combined_risk >= 80:
        final_decision = AccessDecisionType.DENY
        mfa_required = False
    elif combined_risk >= 60:
        final_decision = AccessDecisionType.CHALLENGE
        mfa_required = True
    elif combined_risk >= 40 and combined_trust < 50:
        final_decision = AccessDecisionType.CHALLENGE
        mfa_required = True

    # Create access decision record
    correlation_id = hashlib.sha256(
        f"{user_id}{device_id}{ip_address}{resource_type}{resource_id}{action}{datetime.utcnow()}".encode()
    ).hexdigest()[:16]

    decision_record = AccessDecision(
        decision=final_decision,
        user_id=user_id,
        device_id=device_id,
        ip_address=ip_address,
        user_agent=user_agent,
        location=location,
        resource_type=resource_type,
        resource_id=resource_id,
        action=action,
        risk_score=combined_risk,
        trust_score=combined_trust,
        matched_policies=[{"id": p.id, "name": p.name, "action": p.action.value} for p in policy_result.matched_policies],
        policy_evaluation_ids=[],  # Would need to track evaluation IDs
        mfa_required=mfa_required,
        mfa_verified=False,
        decision_metadata=metadata,
        correlation_id=correlation_id
    )
    db.add(decision_record)
    await db.commit()
    await db.refresh(decision_record)

    # Log security event for deny/challenge
    if final_decision in [AccessDecisionType.DENY, AccessDecisionType.CHALLENGE]:
        await create_security_event(
            db,
            SecurityEventType.ACCESS_DENIED if final_decision == AccessDecisionType.DENY else SecurityEventType.ACCESS_CHALLENGED,
            SecurityEventSeverity.HIGH if final_decision == AccessDecisionType.DENY else SecurityEventSeverity.MEDIUM,
            f"Access {final_decision.value}",
            f"User {user_id} attempted to {action or 'access'} {resource_type or 'resource'} {resource_id or ''}",
            user_id=user_id,
            device_id=device_id,
            ip_address=ip_address,
            user_agent=user_agent,
            location=location,
            risk_score=int(combined_risk)
        )

    return AccessDecisionResponse(
        id=decision_record.id,
        decision=decision_record.decision,
        user_id=decision_record.user_id,
        device_id=decision_record.device_id,
        ip_address=decision_record.ip_address,
        user_agent=decision_record.user_agent,
        location=decision_record.location,
        resource_type=decision_record.resource_type,
        resource_id=decision_record.resource_id,
        action=decision_record.action,
        risk_score=decision_record.risk_score,
        trust_score=decision_record.trust_score,
        matched_policies=decision_record.matched_policies,
        policy_evaluation_ids=decision_record.policy_evaluation_ids,
        mfa_required=decision_record.mfa_required,
        mfa_verified=decision_record.mfa_verified,
        decision_metadata=decision_record.decision_metadata,
        correlation_id=decision_record.correlation_id,
        created_at=decision_record.created_at
    )