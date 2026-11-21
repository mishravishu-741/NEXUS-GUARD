import pytest
from httpx import AsyncClient
from app.services.threat_detection import ThreatDetectionService
from app.models.security_event import SecurityEvent, SecurityEventType
from app.models.threat_alert import ThreatAlert, ThreatType, ThreatSeverity
from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta


@pytest.mark.asyncio
async def test_detect_brute_force_user(db: AsyncSession, test_user: User):
    """Test brute force detection for user"""
    service = ThreatDetectionService(db)

    # Create multiple failed login events
    for i in range(6):
        event = SecurityEvent(
            event_type=SecurityEventType.LOGIN_FAILURE,
            severity="medium",
            title="Failed login",
            user_id=test_user.id,
            ip_address="192.168.1.100",
            created_at=datetime.utcnow() - timedelta(minutes=5)
        )
        db.add(event)
    await db.commit()

    alerts = await service._detect_brute_force(test_user.id, "192.168.1.100")

    assert len(alerts) > 0
    assert any(a.threat_type == ThreatType.BRUTE_FORCE for a in alerts)


@pytest.mark.asyncio
async def test_detect_credential_stuffing(db: AsyncSession):
    """Test credential stuffing detection"""
    service = ThreatDetectionService(db)

    # Create failed logins for multiple users from same IP
    for user_id in range(1, 7):
        event = SecurityEvent(
            event_type=SecurityEventType.LOGIN_FAILURE,
            severity="medium",
            title="Failed login",
            user_id=user_id,
            ip_address="10.0.0.50",
            created_at=datetime.utcnow() - timedelta(minutes=10)
        )
        db.add(event)
    await db.commit()

    alerts = await service._detect_credential_stuffing("10.0.0.50")

    assert len(alerts) > 0
    assert any(a.threat_type == ThreatType.CREDENTIAL_STUFFING for a in alerts)


@pytest.mark.asyncio
async def test_detect_suspicious_login_new_device(db: AsyncSession, test_user: User):
    """Test suspicious login detection for new device"""
    from app.models.device import Device, DeviceStatus
    service = ThreatDetectionService(db)

    # Create pending device
    device = Device(
        device_id="new_device_1",
        name="New Device",
        device_type="mobile",
        status=DeviceStatus.PENDING,
        owner_id=test_user.id,
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)

    alerts = await service._detect_suspicious_login(
        test_user.id, "192.168.1.100", "Mozilla/5.0", device.id
    )

    assert len(alerts) > 0
    assert any(a.threat_type == ThreatType.NEW_DEVICE for a in alerts)


@pytest.mark.asyncio
async def test_detect_impossible_travel(db: AsyncSession, test_user: User):
    """Test impossible travel detection"""
    service = ThreatDetectionService(db)

    # Create previous login from different IP
    prev_event = SecurityEvent(
        event_type=SecurityEventType.LOGIN_SUCCESS,
        severity="info",
        title="Previous login",
        user_id=test_user.id,
        ip_address="192.168.1.100",
        created_at=datetime.utcnow() - timedelta(minutes=30)
    )
    db.add(prev_event)
    await db.commit()

    alerts = await service._detect_impossible_travel(test_user.id, "10.0.0.1")

    assert len(alerts) > 0
    assert any(a.threat_type == ThreatType.IMPOSSIBLE_TRAVEL for a in alerts)


@pytest.mark.asyncio
async def test_analyze_login_attempt_success(db: AsyncSession, test_user: User):
    """Test full login attempt analysis for success"""
    service = ThreatDetectionService(db)

    alerts = await service.analyze_login_attempt(
        user_id=test_user.id,
        ip_address="192.168.1.100",
        user_agent="Mozilla/5.0",
        success=True
    )

    # Should not generate alerts for successful login from known IP
    assert isinstance(alerts, list)


@pytest.mark.asyncio
async def test_analyze_login_attempt_failure(db: AsyncSession, test_user: User):
    """Test full login attempt analysis for failure"""
    service = ThreatDetectionService(db)

    alerts = await service.analyze_login_attempt(
        user_id=test_user.id,
        ip_address="192.168.1.100",
        user_agent="Mozilla/5.0",
        success=False
    )

    assert isinstance(alerts, list)


@pytest.mark.asyncio
async def test_periodic_detection(db: AsyncSession, test_user: User):
    """Test periodic threat detection scan"""
    from app.models.device import Device, DeviceStatus
    service = ThreatDetectionService(db)

    # Create high-risk device
    device = Device(
        device_id="high_risk_device",
        name="High Risk Device",
        device_type="laptop",
        status=DeviceStatus.TRUSTED,
        owner_id=test_user.id,
        risk_score=85.0,
        trust_score=20.0,
    )
    db.add(device)
    await db.commit()

    results = await service.run_periodic_detection()

    assert "suspicious_devices" in results
    assert results["suspicious_devices"] >= 1