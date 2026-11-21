from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text, Index, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class SecurityEventType(str, enum.Enum):
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGIN_MFA_SUCCESS = "login_mfa_success"
    LOGIN_MFA_FAILURE = "login_mfa_failure"
    LOGOUT = "logout"
    SESSION_EXPIRED = "session_expired"
    PASSWORD_CHANGE = "password_change"
    MFA_ENABLED = "mfa_enabled"
    MFA_DISABLED = "mfa_disabled"
    DEVICE_REGISTERED = "device_registered"
    DEVICE_APPROVED = "device_approved"
    DEVICE_REVOKED = "device_revoked"
    DEVICE_TRUST_CHANGED = "device_trust_changed"
    POLICY_CREATED = "policy_created"
    POLICY_UPDATED = "policy_updated"
    POLICY_DELETED = "policy_deleted"
    POLICY_EVALUATED = "policy_evaluated"
    ACCESS_GRANTED = "access_granted"
    ACCESS_DENIED = "access_denied"
    ACCESS_CHALLENGED = "access_challenged"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    THREAT_DETECTED = "threat_detected"
    NETWORK_ANOMALY = "network_anomaly"
    CONFIG_CHANGED = "config_changed"


class SecurityEventSeverity(str, enum.Enum):
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(SQLEnum(SecurityEventType), nullable=False, index=True)
    severity = Column(SQLEnum(SecurityEventSeverity), default=SecurityEventSeverity.INFO, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Context
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="SET NULL"), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True, index=True)
    user_agent = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)

    # Additional data
    event_metadata = Column("metadata", JSON, nullable=True)
    risk_score = Column(Integer, default=0, nullable=False)  # 0-100

    # Resolution
    is_resolved = Column(Boolean, default=False, nullable=False)
    resolved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    device = relationship("Device", back_populates="security_events")
    resolver = relationship("User", foreign_keys=[resolved_by])

    __table_args__ = (
        Index("ix_security_events_type_severity", "event_type", "severity"),
        Index("ix_security_events_user_created", "user_id", "created_at"),
        Index("ix_security_events_device_created", "device_id", "created_at"),
        Index("ix_security_events_resolved", "is_resolved", "created_at"),
    )