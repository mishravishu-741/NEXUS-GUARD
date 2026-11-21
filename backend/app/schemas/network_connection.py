from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models.network_connection import ConnectionStatus


class NetworkConnectionResponse(BaseModel):
    id: int
    local_address: str
    local_port: int
    remote_address: Optional[str]
    remote_port: Optional[int]
    protocol: str
    status: ConnectionStatus
    pid: Optional[int]
    process_name: Optional[str]
    process_user: Optional[str]
    interface: Optional[str]
    connection_metadata: Optional[Dict[str, Any]]
    first_seen: datetime
    last_seen: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class NetworkConnectionListResponse(BaseModel):
    connections: List[NetworkConnectionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class NetworkConnectionFilter(BaseModel):
    status: Optional[ConnectionStatus] = None
    pid: Optional[int] = None
    process_name: Optional[str] = None
    local_address: Optional[str] = None
    remote_address: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    search: Optional[str] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)