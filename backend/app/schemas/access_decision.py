from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.access_decision import AccessDecisionType


class AccessDecisionRequest(BaseModel):
    user_id: Optional[int] = None
    device_id: Optional[int] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    location: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    action: Optional[str] = None
    risk_score: float = Field(default=0.0, ge=0.0, le=100.0)
    trust_score: float = Field(default=0.0, ge=0.0, le=100.0)
    decision_metadata: Optional[Dict[str, Any]] = None


class AccessDecisionResponse(BaseModel):
    id: int
    decision: AccessDecisionType
    user_id: Optional[int]
    device_id: Optional[int]
    ip_address: Optional[str]
    user_agent: Optional[str]
    location: Optional[str]
    resource_type: Optional[str]
    resource_id: Optional[str]
    action: Optional[str]
    risk_score: float
    trust_score: float
    matched_policies: Optional[List[Dict[str, Any]]]
    policy_evaluation_ids: Optional[List[int]]
    mfa_required: bool
    mfa_verified: bool
    decision_metadata: Optional[Dict[str, Any]]
    correlation_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AccessDecisionListResponse(BaseModel):
    decisions: List[AccessDecisionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int