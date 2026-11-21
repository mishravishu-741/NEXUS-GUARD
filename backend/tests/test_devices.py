import pytest
from httpx import AsyncClient
from app.models.user import User
from app.models.device import Device, DeviceStatus


@pytest.mark.asyncio
async def test_register_device(client: AsyncClient, auth_headers: dict):
    """Test device registration"""
    response = await client.post("/api/devices", headers=auth_headers, json={
        "device_id": "test_device_123",
        "name": "Test Device",
        "device_type": "laptop",
        "os_name": "macOS",
        "os_version": "14.0",
        "browser_name": "Chrome",
        "browser_version": "120.0"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["device_id"] == "test_device_123"
    assert data["name"] == "Test Device"
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_list_devices(client: AsyncClient, auth_headers: dict, test_device: Device):
    """Test listing devices"""
    response = await client.get("/api/devices", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "devices" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_get_device(client: AsyncClient, auth_headers: dict, test_device: Device):
    """Test getting device details"""
    response = await client.get(f"/api/devices/{test_device.id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_device.id
    assert data["device_id"] == test_device.device_id


@pytest.mark.asyncio
async def test_update_device(client: AsyncClient, auth_headers: dict, test_device: Device):
    """Test updating device"""
    response = await client.patch(f"/api/devices/{test_device.id}",
        headers=auth_headers,
        json={"name": "Updated Device Name"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Device Name"


@pytest.mark.asyncio
async def test_approve_device(client: AsyncClient, admin_auth_headers: dict, test_device: Device):
    """Test approving a device (admin only)"""
    response = await client.post(f"/api/devices/{test_device.id}/approve",
        headers=admin_auth_headers,
        json={"approve": True}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "trusted"


@pytest.mark.asyncio
async def test_reject_device(client: AsyncClient, admin_auth_headers: dict, test_device: Device):
    """Test rejecting a device (admin only)"""
    response = await client.post(f"/api/devices/{test_device.id}/approve",
        headers=admin_auth_headers,
        json={"approve": False, "reason": "Suspicious device"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "revoked"


@pytest.mark.asyncio
async def test_revoke_device(client: AsyncClient, admin_auth_headers: dict, test_device: Device):
    """Test revoking a trusted device"""
    # First approve it
    await client.post(f"/api/devices/{test_device.id}/approve",
        headers=admin_auth_headers,
        json={"approve": True}
    )

    # Then revoke
    response = await client.post(f"/api/devices/{test_device.id}/revoke",
        headers=admin_auth_headers,
        json={"reason": "Security policy violation"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "revoked"


@pytest.mark.asyncio
async def test_device_trust_assessment(client: AsyncClient, auth_headers: dict, test_device: Device):
    """Test device trust assessment"""
    response = await client.get(f"/api/devices/{test_device.id}/trust-assessment",
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "trust_score" in data
    assert "risk_score" in data
    assert "factors" in data
    assert "recommendations" in data


@pytest.mark.asyncio
async def test_unauthorized_device_access(client: AsyncClient, auth_headers: dict, another_user_device: Device):
    """Test that users cannot access other users' devices"""
    response = await client.get(f"/api/devices/{another_user_device.id}", headers=auth_headers)
    assert response.status_code == 403