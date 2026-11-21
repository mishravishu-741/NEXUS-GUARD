from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.threat_alert import ThreatType, ThreatSeverity, ThreatStatus


class ThreatAlertResponse(BaseModel):
    id: int
    threat_type: ThreatType
    severity: ThreatSeverity
    status: ThreatStatus
    title: str
    description: Optional[str]
    user_id: Optional[int]
    device_id: Optional[int]
    ip_address: Optional[str]
    detection_method: Optional[str]
    confidence_score: float
    risk_score: float
    evidence: Optional[Dict[str, Any]]
    indicators: Optional[Dict[str, Any]]
    assigned_to: Optional[int]
    resolved_by: Optional[int]
    resolved_at: Optional[datetime]
    resolution_notes: Optional[str]
    mitigation_actions: Optional[Dict[str, Any]]
    first_detected: datetime
    last_detected: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ThreatAlertListResponse(BaseModel):
    alerts: List[ThreatAlertResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class ThreatAlertUpdate(BaseModel):
    status: Optional[ThreatStatus] = None
    assigned_to: Optional[int] = None
    resolution_notes: Optional[str] = None
    mitigation_actions: Optional[Dict[str, Any]] = None


class ThreatAlertFilter(BaseModel):
    threat_type: Optional[ThreatType] = None
    severity: Optional[ThreatSeverity] = None
    status: Optional[ThreatStatus] = None
    user_id: Optional[int] = None
    device_id: Optional[int] = None
    ip_address: Optional[str] = None
    assigned_to: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class ThreatAlertStats(BaseModel):
    total_alerts: int
    by_severity: Dict[str, int]
    by_type: Dict[str, int]
    by_status: Dict[str, int]
    open_count: int
    critical_count: int
    high_count: int
    last_24h: int
    last_7d: int
    last_30d: int