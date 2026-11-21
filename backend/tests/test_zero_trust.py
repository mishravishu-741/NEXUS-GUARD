import pytest
from httpx import AsyncClient
from app.services.zero_trust import ZeroTrustEngine, calculate_device_trust_score, make_access_decision
from app.models.user import User
from app.models.device import Device, DeviceStatus
from app.models.policy import Policy, PolicyType, PolicyAction
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_calculate_device_trust_score_trusted(db: AsyncSession, test_user: User):
    """Test trust score calculation for trusted device"""
    device = Device(
        device_id="trusted_device_1",
        name="Trusted Laptop",
        device_type="laptop",
        status=DeviceStatus.TRUSTED,
        owner_id=test_user.id,
        os_name="macOS",
        os_version="14.0",
        browser_name="Chrome",
        browser_version="120.0",
        ip_address="192.168.1.100",
        location="Office",
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)

    assessment = await calculate_device_trust_score(device, db)

    assert assessment.trust_score > 50
    assert assessment.risk_score < 50
    assert "device_status" in assessment.factors


@pytest.mark.asyncio
async def test_calculate_device_trust_score_untrusted(db: AsyncSession, test_user: User):
    """Test trust score calculation for untrusted device"""
    device = Device(
        device_id="untrusted_device_1",
        name="Unknown Device",
        device_type="unknown",
        status=DeviceStatus.UNTRUSTED,
        owner_id=test_user.id,
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)

    assessment = await calculate_device_trust_score(device, db)

    assert assessment.trust_score < 50
    assert assessment.risk_score > 30


@pytest.mark.asyncio
async def test_zero_trust_engine_verify_identity(db: AsyncSession, test_user: User):
    """Test identity verification"""
    engine = ZeroTrustEngine(db)
    result = await engine.verify_identity(test_user.id)

    assert "verified" in result
    assert "risk_score" in result
    assert "risk_factors" in result
    assert result["user_id"] == test_user.id


@pytest.mark.asyncio
async def test_make_access_decision_allow(db: AsyncSession, test_user: User):
    """Test access decision for low-risk scenario"""
    # Create a trusted device
    device = Device(
        device_id="trusted_device_2",
        name="Trusted Device",
        device_type="laptop",
        status=DeviceStatus.TRUSTED,
        owner_id=test_user.id,
        trust_score=90.0,
        risk_score=5.0,
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)

    decision = await make_access_decision(
        user_id=test_user.id,
        device_id=device.id,
        ip_address="192.168.1.100",
        resource_type="dashboard",
        action="read",
        risk_score=10.0,
        trust_score=90.0,
        db=db
    )

    assert decision.decision.value in ["allow", "monitor"]
    assert decision.risk_score <= 30
    assert decision.trust_score >= 70


@pytest.mark.asyncio
async def test_make_access_decision_deny_high_risk(db: AsyncSession, test_user: User):
    """Test access decision denies high-risk requests"""
    decision = await make_access_decision(
        user_id=test_user.id,
        ip_address="10.0.0.1",
        resource_type="admin",
        action="write",
        risk_score=90.0,
        trust_score=10.0,
        db=db
    )

    assert decision.decision.value == "deny"
    assert decision.risk_score >= 80


@pytest.mark.asyncio
async def test_make_access_decision_challenge_medium_risk(db: AsyncSession, test_user: User):
    """Test access decision challenges medium-risk requests"""
    decision = await make_access_decision(
        user_id=test_user.id,
        ip_address="10.0.0.1",
        resource_type="sensitive",
        action="read",
        risk_score=65.0,
        trust_score=40.0,
        db=db
    )

    assert decision.decision.value in ["challenge", "deny"]
    assert decision.mfa_required is True or decision.decision.value == "deny"


@pytest.mark.asyncio
async def test_policy_evaluation_priority(db: AsyncSession, admin_user: User):
    """Test that higher priority policies are evaluated first"""
    # Create low priority allow policy
    low_policy = Policy(
        name="Low Priority Allow",
        policy_type=PolicyType.ACCESS,
        action=PolicyAction.ALLOW,
        priority=100,
        conditions={"resource_type": "test"},
        min_risk_score=0,
        max_risk_score=100,
        created_by=admin_user.id,
    )
    db.add(low_policy)

    # Create high priority deny policy
    high_policy = Policy(
        name="High Priority Deny",
        policy_type=PolicyType.ACCESS,
        action=PolicyAction.DENY,
        priority=10,
        conditions={"resource_type": "test"},
        min_risk_score=0,
        max_risk_score=100,
        created_by=admin_user.id,
    )
    db.add(high_policy)
    await db.commit()

    # Evaluate - high priority should win
    decision = await make_access_decision(
        user_id=admin_user.id,
        resource_type="test",
        action="read",
        risk_score=50.0,
        trust_score=50.0,
        db=db
    )

    # High priority deny should take precedence
    assert decision.decision.value == "deny"