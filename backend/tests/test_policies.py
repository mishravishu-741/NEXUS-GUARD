import pytest
from httpx import AsyncClient
from app.models.policy import Policy, PolicyType, PolicyAction
from app.models.user import User


@pytest.mark.asyncio
async def test_create_policy(client: AsyncClient, admin_auth_headers: dict):
    """Test creating a policy"""
    response = await client.post("/api/policies", headers=admin_auth_headers, json={
        "name": "Block High Risk Access",
        "description": "Deny access for high risk scores",
        "policy_type": "access",
        "action": "deny",
        "priority": 10,
        "conditions": {"risk_score": {"gte": 80}},
        "min_risk_score": 80,
        "max_risk_score": 100
    })
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Block High Risk Access"
    assert data["action"] == "deny"
    assert data["policy_type"] == "access"


@pytest.mark.asyncio
async def test_list_policies(client: AsyncClient, admin_auth_headers: dict, test_policy: Policy):
    """Test listing policies"""
    response = await client.get("/api/policies", headers=admin_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "policies" in data
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_get_policy(client: AsyncClient, admin_auth_headers: dict, test_policy: Policy):
    """Test getting a policy"""
    response = await client.get(f"/api/policies/{test_policy.id}", headers=admin_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == test_policy.id
    assert data["name"] == test_policy.name


@pytest.mark.asyncio
async def test_update_policy(client: AsyncClient, admin_auth_headers: dict, test_policy: Policy):
    """Test updating a policy"""
    response = await client.patch(f"/api/policies/{test_policy.id}",
        headers=admin_auth_headers,
        json={"priority": 5, "is_active": False}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["priority"] == 5
    assert data["is_active"] is False


@pytest.mark.asyncio
async def test_delete_policy(client: AsyncClient, admin_auth_headers: dict, test_policy: Policy):
    """Test deleting a policy"""
    response = await client.delete(f"/api/policies/{test_policy.id}", headers=admin_auth_headers)
    assert response.status_code == 204

    # Verify deleted
    response = await client.get(f"/api/policies/{test_policy.id}", headers=admin_auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_evaluate_policy(client: AsyncClient, admin_auth_headers: dict):
    """Test policy evaluation"""
    response = await client.post("/api/policies/evaluate",
        headers=admin_auth_headers,
        json={
            "user_id": 1,
            "risk_score": 90,
            "trust_score": 20,
            "resource_type": "admin",
            "action": "write"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "decision" in data
    assert "matched_policies" in data
    assert "risk_score" in data
    assert "trust_score" in data


@pytest.mark.asyncio
async def test_non_admin_cannot_manage_policies(client: AsyncClient, auth_headers: dict):
    """Test that non-admin users cannot manage policies"""
    # Try to create
    response = await client.post("/api/policies", headers=auth_headers, json={
        "name": "Test Policy",
        "policy_type": "access",
        "action": "allow"
    })
    assert response.status_code == 403

    # Try to list
    response = await client.get("/api/policies", headers=auth_headers)
    assert response.status_code == 403