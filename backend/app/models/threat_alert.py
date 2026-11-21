from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text, Index, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ThreatType(str, enum.Enum):
    BRUTE_FORCE = "brute_force"
    CREDENTIAL_STUFFING = "credential_stuffing"
    SUSPICIOUS_LOGIN = "suspicious_login"
    IMPOSSIBLE_TRAVEL = "impossible_travel"
    NEW_DEVICE = "new_device"
    UNTRUSTED_DEVICE = "untrusted_device"
    HIGH_RISK_DEVICE = "high_risk_device"
    SUSPICIOUS_IP = "suspicious_ip"
    TOR_EXIT_NODE = "tor_exit_node"
    VPN_PROXY = "vpn_proxy"
    ANONYMOUS_PROXY = "anonymous_proxy"
    MALICIOUS_IP = "malicious_ip"
    DATA_EXFILTRATION = "data_exfiltration"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    LATERAL_MOVEMENT = "lateral_movement"
    ANOMALOUS_BEHAVIOR = "anomalous_behavior"
    POLICY_VIOLATION = "policy_violation"


class ThreatSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ThreatStatus(str, enum.Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    MITIGATED = "mitigated"
    FALSE_POSITIVE = "false_positive"
    CLOSED = "closed"


class ThreatAlert(Base):
    __tablename__ = "threat_alerts"

    id = Column(Integer, primary_key=True, index=True)
    threat_type = Column(SQLEnum(ThreatType), nullable=False, index=True)
    severity = Column(SQLEnum(ThreatSeverity), default=ThreatSeverity.MEDIUM, nullable=False)
    status = Column(SQLEnum(ThreatStatus), default=ThreatStatus.OPEN, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Related entities
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="SET NULL"), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True, index=True)

    # Detection details
    detection_method = Column(String(100), nullable=True)
    confidence_score = Column(Float, default=0.0, nullable=False)  # 0.0 to 1.0
    risk_score = Column(Float, default=0.0, nullable=False)  # 0 to 100

    # Evidence
    evidence = Column(JSON, nullable=True)  # Supporting evidence
    indicators = Column(JSON, nullable=True)  # IOCs

    # Resolution
    assigned_to = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    mitigation_actions = Column(JSON, nullable=True)

    # Timestamps
    first_detected = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    last_detected = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    device = relationship("Device")
    assignee = relationship("User", foreign_keys=[assigned_to])
    resolver = relationship("User", foreign_keys=[resolved_by])

    __table_args__ = (
        Index("ix_threat_alerts_type_severity", "threat_type", "severity"),
        Index("ix_threat_alerts_status", "status"),
        Index("ix_threat_alerts_user_status", "user_id", "status"),
        Index("ix_threat_alerts_detected", "first_detected"),
    )