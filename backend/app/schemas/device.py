from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.device import DeviceStatus, DeviceType


class DeviceBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    device_type: DeviceType = DeviceType.UNKNOWN


class DeviceCreate(DeviceBase):
    device_id: str = Field(..., min_length=1, max_length=64)
    user_agent: Optional[str] = None
    screen_resolution: Optional[str] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    ip_address: Optional[str] = None
    location: Optional[str] = None
    os_name: Optional[str] = None
    os_version: Optional[str] = None
    browser_name: Optional[str] = None
    browser_version: Optional[str] = None


class DeviceUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    status: Optional[DeviceStatus] = None
    device_type: Optional[DeviceType] = None
    location: Optional[str] = None


class DeviceResponse(DeviceBase):
    id: int
    device_id: str
    status: DeviceStatus
    trust_score: float
    risk_score: float
    os_name: Optional[str]
    os_version: Optional[str]
    browser_name: Optional[str]
    browser_version: Optional[str]
    user_agent: Optional[str]
    screen_resolution: Optional[str]
    timezone: Optional[str]
    language: Optional[str]
    ip_address: Optional[str]
    mac_address: Optional[str]
    location: Optional[str]
    owner_id: Optional[int]
    approved_by: Optional[int]
    approved_at: Optional[datetime]
    revoked_by: Optional[int]
    revoked_at: Optional[datetime]
    revoked_reason: Optional[str]
    first_seen: datetime
    last_seen: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DeviceListResponse(BaseModel):
    devices: List[DeviceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class DeviceApproval(BaseModel):
    approve: bool
    reason: Optional[str] = None


class DeviceTrustAssessment(BaseModel):
    device_id: str
    trust_score: float
    risk_score: float
    factors: Dict[str, Any]
    recommendations: List[str]