from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.audit_log import AuditAction, AuditResourceType


class AuditLogResponse(BaseModel):
    id: int
    action: AuditAction
    resource_type: AuditResourceType
    resource_id: Optional[str]
    resource_name: Optional[str]
    user_id: Optional[int]
    ip_address: Optional[str]
    user_agent: Optional[str]
    old_values: Optional[Dict[str, Any]]
    new_values: Optional[Dict[str, Any]]
    changed_fields: Optional[List[str]]
    description: Optional[str]
    success: bool
    error_message: Optional[str]
    audit_metadata: Optional[Dict[str, Any]]
    correlation_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    logs: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AuditLogFilter(BaseModel):
    action: Optional[AuditAction] = None
    resource_type: Optional[AuditResourceType] = None
    resource_id: Optional[str] = None
    user_id: Optional[int] = None
    ip_address: Optional[str] = None
    success: Optional[bool] = None
    correlation_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class AuditLogStats(BaseModel):
    total_logs: int
    by_action: Dict[str, int]
    by_resource_type: Dict[str, int]
    success_count: int
    failure_count: int
    last_24h: int
    last_7d: int
    last_30d: int