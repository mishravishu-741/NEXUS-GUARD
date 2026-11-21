import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User, UserRole
from app.core.security import get_password_hash


@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    """Test user registration"""
    response = await client.post("/api/auth/register", json={
        "email": "test@example.com",
        "username": "testuser",
        "password": "SecurePass123!",
        "full_name": "Test User"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["username"] == "testuser"
    assert data["role"] == "user"
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient, test_user: User):
    """Test registration with duplicate email fails"""
    response = await client.post("/api/auth/register", json={
        "email": test_user.email,
        "username": "anotheruser",
        "password": "SecurePass123!"
    })
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, test_user: User):
    """Test successful login"""
    response = await client.post("/api/auth/login", json={
        "email": test_user.email,
        "password": "SecureAdmin123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["mfa_required"] is False


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient, test_user: User):
    """Test login with invalid password"""
    response = await client.post("/api/auth/login", json={
        "email": test_user.email,
        "password": "WrongPassword123!"
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client: AsyncClient):
    """Test login with non-existent user"""
    response = await client.post("/api/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "SecurePass123!"
    })
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user(client: AsyncClient, auth_headers: dict):
    """Test getting current user info"""
    response = await client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "email" in data
    assert "username" in data


@pytest.mark.asyncio
async def test_refresh_token(client: AsyncClient, test_user: User):
    """Test token refresh"""
    # Login first
    login_response = await client.post("/api/auth/login", json={
        "email": test_user.email,
        "password": "SecureAdmin123!"
    })
    refresh_token = login_response.json()["refresh_token"]

    # Refresh
    response = await client.post("/api/auth/refresh", json={
        "refresh_token": refresh_token
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_logout(client: AsyncClient, auth_headers: dict):
    """Test logout"""
    response = await client.post("/api/auth/logout", headers=auth_headers)
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_password_hashing():
    """Test password hashing and verification"""
    from app.core.security import get_password_hash, verify_password

    password = "SecurePass123!"
    hashed = get_password_hash(password)

    assert verify_password(password, hashed) is True
    assert verify_password("WrongPass123!", hashed) is False
    assert hashed != password


@pytest.mark.asyncio
async def test_mfa_setup(client: AsyncClient, auth_headers: dict):
    """Test MFA setup"""
    response = await client.post("/api/auth/mfa/setup", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "secret" in data
    assert "qr_code" in data
    assert "backup_codes" in data
    assert len(data["backup_codes"]) == 10


@pytest.mark.asyncio
async def test_mfa_verify(client: AsyncClient, auth_headers: dict):
    """Test MFA verification flow"""
    # Setup MFA first
    setup_response = await client.post("/api/auth/mfa/setup", headers=auth_headers)
    secret = setup_response.json()["secret"]

    # Generate valid TOTP
    import pyotp
    totp = pyotp.TOTP(secret)
    token = totp.now()

    # Verify
    response = await client.post("/api/auth/mfa/verify",
        headers=auth_headers,
        json={"token": token}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_mfa_verify_invalid_token(client: AsyncClient, auth_headers: dict):
    """Test MFA verification with invalid token"""
    response = await client.post("/api/auth/mfa/verify",
        headers=auth_headers,
        json={"token": "000000"}
    )
    assert response.status_code == 401