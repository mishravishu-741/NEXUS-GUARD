from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime


class DashboardStats(BaseModel):
    total_users: int
    active_users: int
    total_devices: int
    trusted_devices: int
    untrusted_devices: int
    pending_devices: int
    security_events_24h: int
    critical_alerts: int
    high_alerts: int
    open_alerts: int
    access_decisions_24h: int
    allow_decisions: int
    deny_decisions: int
    challenge_decisions: int


class ChartDataPoint(BaseModel):
    label: str
    value: int | float


class DashboardCharts(BaseModel):
    events_by_severity: List[ChartDataPoint]
    events_by_type: List[ChartDataPoint]
    alerts_by_severity: List[ChartDataPoint]
    alerts_by_type: List[ChartDataPoint]
    access_decisions: List[ChartDataPoint]
    device_trust_distribution: List[ChartDataPoint]
    login_trends: List[ChartDataPoint]
    threat_trends: List[ChartDataPoint]


class RecentActivity(BaseModel):
    id: int
    type: str
    title: str
    description: Optional[str]
    severity: str
    user: Optional[str]
    device: Optional[str]
    ip: Optional[str]
    timestamp: datetime


class ThreatAnalytics(BaseModel):
    total_threats: int
    by_severity: Dict[str, int]
    by_type: Dict[str, int]
    by_status: Dict[str, int]
    top_threats: List[Dict[str, Any]]
    detection_trends: List[ChartDataPoint]


class AccessDecisionAnalytics(BaseModel):
    total_decisions: int
    by_decision: Dict[str, int]
    by_risk_level: Dict[str, int]
    mfa_challenges: int
    mfa_success_rate: float
    decision_trends: List[ChartDataPoint]


class DeviceAnalytics(BaseModel):
    total_devices: int
    by_status: Dict[str, int]
    by_type: Dict[str, int]
    avg_trust_score: float
    avg_risk_score: float
    trust_distribution: List[ChartDataPoint]
    recent_registrations: List[Dict[str, Any]]