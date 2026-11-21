from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
import json

from app.models.threat_alert import ThreatAlert, ThreatType, ThreatSeverity, ThreatStatus
from app.models.security_event import SecurityEvent, SecurityEventType, SecurityEventSeverity
from app.models.user import User
from app.models.device import Device, DeviceStatus
from app.models.access_decision import AccessDecision, AccessDecisionType
from app.routers.auth import create_security_event
from app.core.config import settings


class ThreatDetectionService:
    """
    Automated threat detection service
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def analyze_login_attempt(self, user_id: int, ip_address: str,
                                     user_agent: str, success: bool,
                                     device_id: Optional[int] = None) -> List[ThreatAlert]:
        """
        Analyze login attempt for threats
        """
        alerts = []

        if not success:
            alerts.extend(await self._detect_brute_force(user_id, ip_address))
            alerts.extend(await self._detect_credential_stuffing(ip_address))
        else:
            alerts.extend(await self._detect_suspicious_login(user_id, ip_address, user_agent, device_id))
            alerts.extend(await self._detect_impossible_travel(user_id, ip_address))

        # Save alerts
        for alert in alerts:
            self.db.add(alert)
        await self.db.commit()

        return alerts

    async def _detect_brute_force(self, user_id: int, ip_address: str) -> List[ThreatAlert]:
        """
        Detect brute force attacks
        """
        alerts = []

        # Check failed logins for this user in last 15 minutes
        result = await self.db.execute(
            select(func.count(SecurityEvent.id)).where(
                SecurityEvent.user_id == user_id,
                SecurityEvent.event_type == SecurityEventType.LOGIN_FAILURE,
                SecurityEvent.created_at >= datetime.utcnow() - timedelta(minutes=15)
            )
        )
        user_failures = result.scalar() or 0

        # Check failed logins from this IP in last 15 minutes
        result = await self.db.execute(
            select(func.count(SecurityEvent.id)).where(
                SecurityEvent.ip_address == ip_address,
                SecurityEvent.event_type == SecurityEventType.LOGIN_FAILURE,
                SecurityEvent.created_at >= datetime.utcnow() - timedelta(minutes=15)
            )
        )
        ip_failures = result.scalar() or 0

        if user_failures >= 5:
            alert = ThreatAlert(
                threat_type=ThreatType.BRUTE_FORCE,
                severity=ThreatSeverity.HIGH if user_failures >= 10 else ThreatSeverity.MEDIUM,
                title=f"Brute force attack detected on user account",
                description=f"{user_failures} failed login attempts in 15 minutes for user ID {user_id}",
                user_id=user_id,
                ip_address=ip_address,
                detection_method="failed_login_threshold",
                confidence_score=0.9,
                risk_score=min(user_failures * 8, 90),
                evidence={"failed_attempts": user_failures, "time_window": "15_minutes"},
                indicators={"ip": ip_address, "user_id": user_id}
            )
            alerts.append(alert)

        if ip_failures >= 10:
            alert = ThreatAlert(
                threat_type=ThreatType.BRUTE_FORCE,
                severity=ThreatSeverity.HIGH,
                title=f"Brute force attack from IP address",
                description=f"{ip_failures} failed login attempts in 15 minutes from IP {ip_address}",
                ip_address=ip_address,
                detection_method="failed_login_threshold_ip",
                confidence_score=0.85,
                risk_score=min(ip_failures * 6, 90),
                evidence={"failed_attempts": ip_failures, "time_window": "15_minutes"},
                indicators={"ip": ip_address}
            )
            alerts.append(alert)

        return alerts

    async def _detect_credential_stuffing(self, ip_address: str) -> List[ThreatAlert]:
        """
        Detect credential stuffing attacks (many usernames from single IP)
        """
        alerts = []

        # Count unique users targeted from this IP in last hour
        result = await self.db.execute(
            select(func.count(func.distinct(SecurityEvent.user_id))).where(
                SecurityEvent.ip_address == ip_address,
                SecurityEvent.event_type == SecurityEventType.LOGIN_FAILURE,
                SecurityEvent.created_at >= datetime.utcnow() - timedelta(hours=1),
                SecurityEvent.user_id.is_not(None)
            )
        )
        unique_users = result.scalar() or 0

        if unique_users >= 5:
            alert = ThreatAlert(
                threat_type=ThreatType.CREDENTIAL_STUFFING,
                severity=ThreatSeverity.HIGH if unique_users >= 10 else ThreatSeverity.MEDIUM,
                title=f"Credential stuffing attack detected",
                description=f"Login failures for {unique_users} different users from IP {ip_address} in 1 hour",
                ip_address=ip_address,
                detection_method="multi_user_targeting",
                confidence_score=0.8,
                risk_score=min(unique_users * 7, 90),
                evidence={"unique_users_targeted": unique_users, "time_window": "1_hour"},
                indicators={"ip": ip_address}
            )
            alerts.append(alert)

        return alerts

    async def _detect_suspicious_login(self, user_id: int, ip_address: str,
                                        user_agent: str, device_id: Optional[int]) -> List[ThreatAlert]:
        """
        Detect suspicious successful logins
        """
        alerts = []

        # Check if this is a new device
        if device_id:
            device_result = await self.db.execute(
                select(Device).where(Device.id == device_id)
            )
            device = device_result.scalar_one_or_none()

            if device and device.status == DeviceStatus.PENDING:
                alert = ThreatAlert(
                    threat_type=ThreatType.NEW_DEVICE,
                    severity=ThreatSeverity.MEDIUM,
                    title=f"Login from new/unapproved device",
                    description=f"User {user_id} logged in from pending device {device.name}",
                    user_id=user_id,
                    device_id=device_id,
                    ip_address=ip_address,
                    detection_method="new_device_login",
                    confidence_score=0.7,
                    risk_score=40,
                    evidence={"device_id": device.device_id, "device_status": device.status.value},
                    indicators={"device": device.device_id, "ip": ip_address}
                )
                alerts.append(alert)

            if device and device.status == DeviceStatus.UNTRUSTED:
                alert = ThreatAlert(
                    threat_type=ThreatType.UNTRUSTED_DEVICE,
                    severity=ThreatSeverity.HIGH,
                    title=f"Login from untrusted device",
                    description=f"User {user_id} logged in from untrusted device {device.name}",
                    user_id=user_id,
                    device_id=device_id,
                    ip_address=ip_address,
                    detection_method="untrusted_device_login",
                    confidence_score=0.85,
                    risk_score=70,
                    evidence={"device_id": device.device_id, "trust_score": device.trust_score},
                    indicators={"device": device.device_id, "ip": ip_address}
                )
                alerts.append(alert)

            if device and device.risk_score > 70:
                alert = ThreatAlert(
                    threat_type=ThreatType.HIGH_RISK_DEVICE,
                    severity=ThreatSeverity.HIGH,
                    title=f"Login from high-risk device",
                    description=f"User {user_id} logged in from device with risk score {device.risk_score}",
                    user_id=user_id,
                    device_id=device_id,
                    ip_address=ip_address,
                    detection_method="high_risk_device",
                    confidence_score=0.8,
                    risk_score=min(device.risk_score, 90),
                    evidence={"device_id": device.device_id, "risk_score": device.risk_score, "trust_score": device.trust_score},
                    indicators={"device": device.device_id, "ip": ip_address}
                )
                alerts.append(alert)

        # Check for suspicious IP (VPN, Tor, etc. - placeholder)
        # In production, integrate with IP reputation services
        ip_risk = await self._check_ip_threat_intel(ip_address)
        if ip_risk and ip_risk.get("score", 0) > 0:
            threat_type_map = {
                "tor": ThreatType.TOR_EXIT_NODE,
                "vpn": ThreatType.VPN_PROXY,
                "proxy": ThreatType.ANONYMOUS_PROXY,
                "malicious": ThreatType.MALICIOUS_IP
            }
            alert = ThreatAlert(
                threat_type=threat_type_map.get(ip_risk["type"], ThreatType.SUSPICIOUS_IP),
                severity=ThreatSeverity.HIGH if ip_risk.get("score", 0) > 70 else ThreatSeverity.MEDIUM,
                title=f"Login from suspicious IP",
                description=f"User {user_id} logged in from {ip_risk['type']} IP: {ip_address}",
                user_id=user_id,
                ip_address=ip_address,
                detection_method="ip_reputation",
                confidence_score=ip_risk.get("confidence", 0),
                risk_score=ip_risk.get("score", 0),
                evidence=ip_risk.get("evidence"),
                indicators={"ip": ip_address, "threat_type": ip_risk.get("type")}
            )
            alerts.append(alert)

        return alerts

    async def _detect_impossible_travel(self, user_id: int, ip_address: str) -> List[ThreatAlert]:
        """
        Detect impossible travel (logins from distant locations in short time)
        """
        alerts = []

        # Get last successful login
        result = await self.db.execute(
            select(SecurityEvent.ip_address, SecurityEvent.created_at).where(
                SecurityEvent.user_id == user_id,
                SecurityEvent.event_type == SecurityEventType.LOGIN_SUCCESS,
                SecurityEvent.ip_address.is_not(None),
                SecurityEvent.ip_address != ip_address,
                SecurityEvent.created_at >= datetime.utcnow() - timedelta(hours=24)
            ).order_by(SecurityEvent.created_at.desc()).limit(1)
        )
        last_login = result.first()

        if last_login:
            last_ip, last_time = last_login
            time_diff = (datetime.utcnow() - last_time).total_seconds() / 3600  # hours

            # In production, use GeoIP to calculate distance
            # For now, flag if different IP within short time
            if time_diff < 1:  # Less than 1 hour
                alert = ThreatAlert(
                    threat_type=ThreatType.IMPOSSIBLE_TRAVEL,
                    severity=ThreatSeverity.HIGH,
                    title=f"Impossible travel detected",
                    description=f"User {user_id} logged in from {ip_address} only {time_diff:.1f}h after login from {last_ip}",
                    user_id=user_id,
                    ip_address=ip_address,
                    detection_method="impossible_travel",
                    confidence_score=0.75,
                    risk_score=80,
                    evidence={
                        "previous_ip": last_ip,
                        "current_ip": ip_address,
                        "time_diff_hours": round(time_diff, 2)
                    },
                    indicators={"previous_ip": last_ip, "current_ip": ip_address}
                )
                alerts.append(alert)

        return alerts

    async def _check_ip_threat_intel(self, ip_address: str) -> Dict[str, Any]:
        """
        Check IP against threat intelligence (placeholder)
        In production, integrate with services like AbuseIPDB, AlienVault, etc.
        """
        # Check internal threat alerts for this IP
        result = await self.db.execute(
            select(ThreatAlert).where(
                ThreatAlert.ip_address == ip_address,
                ThreatAlert.status.in_([ThreatStatus.OPEN, ThreatStatus.INVESTIGATING]),
                ThreatAlert.threat_type.in_([
                    ThreatType.TOR_EXIT_NODE, ThreatType.VPN_PROXY,
                    ThreatType.ANONYMOUS_PROXY, ThreatType.MALICIOUS_IP
                ])
            ).order_by(desc(ThreatAlert.confidence_score)).limit(1)
        )
        existing = result.scalar_one_or_none()

        if existing:
            return {
                "type": existing.threat_type.value,
                "score": existing.risk_score,
                "confidence": existing.confidence_score,
                "evidence": existing.evidence
            }

        # Placeholder: check for known patterns
        # In reality, this would call external APIs
        return {"type": None, "score": 0, "confidence": 0, "evidence": {}}

    async def analyze_access_decision(self, decision: AccessDecision) -> List[ThreatAlert]:
        """
        Analyze access decisions for threats
        """
        alerts = []

        # Multiple denials in short time
        if decision.decision == AccessDecisionType.DENY:
            result = await self.db.execute(
                select(func.count(AccessDecision.id)).where(
                    AccessDecision.user_id == decision.user_id,
                    AccessDecision.decision == AccessDecisionType.DENY,
                    AccessDecision.created_at >= datetime.utcnow() - timedelta(minutes=30)
                )
            )
            deny_count = result.scalar() or 0

            if deny_count >= 5:
                alert = ThreatAlert(
                    threat_type=ThreatType.POLICY_VIOLATION,
                    severity=ThreatSeverity.MEDIUM,
                    title=f"Multiple access denials",
                    description=f"User {decision.user_id} denied access {deny_count} times in 30 minutes",
                    user_id=decision.user_id,
                    ip_address=decision.ip_address,
                    detection_method="multiple_denials",
                    confidence_score=0.7,
                    risk_score=min(deny_count * 5, 70),
                    evidence={"deny_count": deny_count, "time_window": "30_minutes"},
                    indicators={"user_id": decision.user_id, "ip": decision.ip_address}
                )
                alerts.append(alert)

        # High risk score access attempts
        if decision.risk_score > 70:
            alert = ThreatAlert(
                threat_type=ThreatType.ANOMALOUS_BEHAVIOR,
                severity=ThreatSeverity.HIGH if decision.risk_score > 85 else ThreatSeverity.MEDIUM,
                title=f"High-risk access attempt",
                description=f"User {decision.user_id} attempted access with risk score {decision.risk_score}",
                user_id=decision.user_id,
                device_id=decision.device_id,
                ip_address=decision.ip_address,
                detection_method="high_risk_access",
                confidence_score=0.8,
                risk_score=decision.risk_score,
                evidence={"risk_score": decision.risk_score, "trust_score": decision.trust_score, "resource": decision.resource_type},
                indicators={"user_id": decision.user_id, "ip": decision.ip_address}
            )
            alerts.append(alert)

        # Save alerts
        for alert in alerts:
            self.db.add(alert)
        if alerts:
            await self.db.commit()

        return alerts

    async def run_periodic_detection(self) -> Dict[str, int]:
        """
        Run periodic threat detection scans
        """
        results = {
            "brute_force": 0,
            "credential_stuffing": 0,
            "suspicious_devices": 0,
            "anomalous_behavior": 0
        }

        # Scan for ongoing brute force
        result = await self.db.execute(
            select(SecurityEvent.ip_address, func.count(SecurityEvent.id)).where(
                SecurityEvent.event_type == SecurityEventType.LOGIN_FAILURE,
                SecurityEvent.created_at >= datetime.utcnow() - timedelta(hours=1)
            ).group_by(SecurityEvent.ip_address).having(func.count(SecurityEvent.id) >= 20)
        )
        for ip, count in result.all():
            # Check if alert already exists
            existing = await self.db.execute(
                select(ThreatAlert).where(
                    ThreatAlert.ip_address == ip,
                    ThreatAlert.threat_type == ThreatType.BRUTE_FORCE,
                    ThreatAlert.status.in_([ThreatStatus.OPEN, ThreatStatus.INVESTIGATING])
                )
            )
            if not existing.scalar_one_or_none():
                alert = ThreatAlert(
                    threat_type=ThreatType.BRUTE_FORCE,
                    severity=ThreatSeverity.CRITICAL,
                    title=f"Sustained brute force attack",
                    description=f"{count} failed login attempts from {ip} in 1 hour",
                    ip_address=ip,
                    detection_method="periodic_scan",
                    confidence_score=0.9,
                    risk_score=90,
                    evidence={"failed_attempts": count, "time_window": "1_hour"},
                    indicators={"ip": ip}
                )
                self.db.add(alert)
                results["brute_force"] += 1

        # Scan for high-risk devices
        result = await self.db.execute(
            select(Device).where(
                Device.risk_score > 80,
                Device.status.in_([DeviceStatus.TRUSTED, DeviceStatus.PENDING])
            )
        )
        for device in result.scalars().all():
            existing = await self.db.execute(
                select(ThreatAlert).where(
                    ThreatAlert.device_id == device.id,
                    ThreatAlert.threat_type == ThreatType.HIGH_RISK_DEVICE,
                    ThreatAlert.status.in_([ThreatStatus.OPEN, ThreatStatus.INVESTIGATING])
                )
            )
            if not existing.scalar_one_or_none():
                alert = ThreatAlert(
                    threat_type=ThreatType.HIGH_RISK_DEVICE,
                    severity=ThreatSeverity.HIGH,
                    title=f"High-risk device detected",
                    description=f"Device {device.name} has risk score {device.risk_score}",
                    user_id=device.owner_id,
                    device_id=device.id,
                    detection_method="periodic_device_scan",
                    confidence_score=0.85,
                    risk_score=device.risk_score,
                    evidence={"device_id": device.device_id, "risk_score": device.risk_score, "trust_score": device.trust_score},
                    indicators={"device": device.device_id}
                )
                self.db.add(alert)
                results["suspicious_devices"] += 1

        await self.db.commit()
        return results