from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.policy import PolicyType, PolicyAction


class PolicyBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    policy_type: PolicyType
    action: PolicyAction = PolicyAction.MONITOR
    priority: int = Field(default=100, ge=1, le=1000)
    is_active: bool = True
    conditions: Dict[str, Any] = Field(default_factory=dict)
    min_risk_score: float = Field(default=0.0, ge=0.0, le=100.0)
    max_risk_score: float = Field(default=100.0, ge=0.0, le=100.0)
    min_trust_score: float = Field(default=0.0, ge=0.0, le=100.0)
    max_trust_score: float = Field(default=100.0, ge=0.0, le=100.0)
    applies_to_roles: Optional[List[str]] = None
    applies_to_devices: Optional[List[str]] = None
    applies_to_networks: Optional[List[str]] = None


class PolicyCreate(PolicyBase):
    pass


class PolicyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    policy_type: Optional[PolicyType] = None
    action: Optional[PolicyAction] = None
    priority: Optional[int] = Field(None, ge=1, le=1000)
    is_active: Optional[bool] = None
    conditions: Optional[Dict[str, Any]] = None
    min_risk_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    max_risk_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    min_trust_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    max_trust_score: Optional[float] = Field(None, ge=0.0, le=100.0)
    applies_to_roles: Optional[List[str]] = None
    applies_to_devices: Optional[List[str]] = None
    applies_to_networks: Optional[List[str]] = None


class PolicyResponse(PolicyBase):
    id: int
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PolicyListResponse(BaseModel):
    policies: List[PolicyResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class PolicyEvaluationRequest(BaseModel):
    user_id: Optional[int] = None
    device_id: Optional[int] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    location: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    action: Optional[str] = None
    risk_score: float = 0.0
    trust_score: float = 0.0


class PolicyEvaluationResponse(BaseModel):
    decision: PolicyAction
    matched_policies: List[PolicyResponse]
    risk_score: float
    trust_score: float
    mfa_required: bool = False