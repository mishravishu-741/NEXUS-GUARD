from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text, Index, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class AccessDecisionType(str, enum.Enum):
    ALLOW = "allow"
    DENY = "deny"
    CHALLENGE = "challenge"
    MONITOR = "monitor"


class AccessDecision(Base):
    __tablename__ = "access_decisions"

    id = Column(Integer, primary_key=True, index=True)
    decision = Column(SQLEnum(AccessDecisionType), nullable=False)

    # Request context
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="SET NULL"), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True, index=True)
    user_agent = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)

    # Resource requested
    resource_type = Column(String(100), nullable=True)
    resource_id = Column(String(100), nullable=True)
    action = Column(String(50), nullable=True)  # read, write, delete, execute

    # Risk/Trust scores
    risk_score = Column(Float, default=0.0, nullable=False)
    trust_score = Column(Float, default=0.0, nullable=False)

    # Policy evaluation
    matched_policies = Column(JSON, nullable=True)  # List of policy IDs that matched
    policy_evaluation_ids = Column(JSON, nullable=True)  # List of evaluation IDs

    # MFA challenge
    mfa_required = Column(Boolean, default=False, nullable=False)
    mfa_verified = Column(Boolean, default=False, nullable=False)

    # Metadata
    decision_metadata = Column("metadata", JSON, nullable=True)
    correlation_id = Column(String(64), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="access_decisions")
    device = relationship("Device", back_populates="access_decisions")

    __table_args__ = (
        Index("ix_access_decisions_user_created", "user_id", "created_at"),
        Index("ix_access_decisions_device_created", "device_id", "created_at"),
        Index("ix_access_decisions_decision", "decision"),
        Index("ix_access_decisions_correlation", "correlation_id"),
    )