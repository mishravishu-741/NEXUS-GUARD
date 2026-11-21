import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.core.security import get_password_hash, create_access_token
from app.models.user import User, UserRole
from app.models.device import Device, DeviceStatus
from app.models.mfa import MFAConfig


# Test database
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestAsyncSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def override_get_db():
    async with TestAsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


@pytest_asyncio.fixture(scope="function")
async def db():
    """Create test database and session"""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestAsyncSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db: AsyncSession):
    """Create test client with overridden database"""
    app.dependency_overrides[get_db] = lambda: db

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def test_user(db: AsyncSession):
    """Create a test user"""
    user = User(
        email="test@example.com",
        username="testuser",
        full_name="Test User",
        hashed_password=get_password_hash("SecurePass123!"),
        role=UserRole.USER,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Create MFA config
    mfa_config = MFAConfig(user_id=user.id, allowed_methods='["totp", "backup_codes"]')
    db.add(mfa_config)
    await db.commit()

    return user


@pytest_asyncio.fixture(scope="function")
async def admin_user(db: AsyncSession):
    """Create an admin user"""
    user = User(
        email="admin@nexusguard.local",
        username="admin",
        full_name="System Administrator",
        hashed_password=get_password_hash("SecureAdmin123!"),
        role=UserRole.ADMIN,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Create MFA config
    mfa_config = MFAConfig(user_id=user.id, allowed_methods='["totp", "backup_codes"]')
    db.add(mfa_config)
    await db.commit()

    return user


@pytest_asyncio.fixture(scope="function")
async def another_user(db: AsyncSession):
    """Create another test user"""
    user = User(
        email="another@example.com",
        username="anotheruser",
        full_name="Another User",
        hashed_password=get_password_hash("SecurePass123!"),
        role=UserRole.USER,
        is_active=True,
        is_verified=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    mfa_config = MFAConfig(user_id=user.id, allowed_methods='["totp", "backup_codes"]')
    db.add(mfa_config)
    await db.commit()

    return user


@pytest_asyncio.fixture(scope="function")
def auth_headers(test_user: User):
    """Create auth headers for test user"""
    token = create_access_token(
        data={"sub": test_user.email, "user_id": test_user.id, "role": test_user.role.value}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture(scope="function")
def admin_auth_headers(admin_user: User):
    """Create auth headers for admin user"""
    token = create_access_token(
        data={"sub": admin_user.email, "user_id": admin_user.id, "role": admin_user.role.value}
    )
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture(scope="function")
async def test_device(db: AsyncSession, test_user: User):
    """Create a test device"""
    device = Device(
        device_id="test_device_123",
        name="Test Device",
        device_type="laptop",
        status=DeviceStatus.PENDING,
        owner_id=test_user.id,
        trust_score=50.0,
        risk_score=10.0,
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)
    return device


@pytest_asyncio.fixture(scope="function")
async def another_user_device(db: AsyncSession, another_user: User):
    """Create a test device for another user"""
    device = Device(
        device_id="another_device_456",
        name="Another Device",
        device_type="mobile",
        status=DeviceStatus.PENDING,
        owner_id=another_user.id,
        trust_score=50.0,
        risk_score=10.0,
    )
    db.add(device)
    await db.commit()
    await db.refresh(device)
    return device


@pytest_asyncio.fixture(scope="function")
async def test_policy(db: AsyncSession, admin_user: User):
    """Create a test policy"""
    policy = Policy(
        name="Test Policy",
        description="Test policy for testing",
        policy_type=PolicyType.ACCESS,
        action=PolicyAction.ALLOW,
        priority=100,
        conditions={},
        min_risk_score=0,
        max_risk_score=100,
        min_trust_score=0,
        max_trust_score=100,
        created_by=admin_user.id,
        updated_by=admin_user.id,
    )
    db.add(policy)
    await db.commit()
    await db.refresh(policy)
    return policy