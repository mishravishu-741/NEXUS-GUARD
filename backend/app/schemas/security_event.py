from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.security_event import SecurityEventType, SecurityEventSeverity


class SecurityEventResponse(BaseModel):
    id: int
    event_type: SecurityEventType
    severity: SecurityEventSeverity
    title: str
    description: Optional[str]
    user_id: Optional[int]
    device_id: Optional[int]
    ip_address: Optional[str]
    user_agent: Optional[str]
    location: Optional[str]
    event_metadata: Optional[Dict[str, Any]]
    risk_score: int
    is_resolved: bool
    resolved_by: Optional[int]
    resolved_at: Optional[datetime]
    resolution_notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class SecurityEventListResponse(BaseModel):
    events: List[SecurityEventResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class SecurityEventFilter(BaseModel):
    event_type: Optional[SecurityEventType] = None
    severity: Optional[SecurityEventSeverity] = None
    user_id: Optional[int] = None
    device_id: Optional[int] = None
    ip_address: Optional[str] = None
    is_resolved: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class SecurityEventStats(BaseModel):
    total_events: int
    by_severity: Dict[str, int]
    by_type: Dict[str, int]
    resolved_count: int
    unresolved_count: int
    last_24h: int
    last_7d: int
    last_30d: int