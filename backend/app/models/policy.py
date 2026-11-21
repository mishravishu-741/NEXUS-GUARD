from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text, Index, Float, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class PolicyType(str, enum.Enum):
    ACCESS = "access"
    DEVICE = "device"
    NETWORK = "network"
    THREAT = "threat"
    AUTHENTICATION = "authentication"


class PolicyAction(str, enum.Enum):
    ALLOW = "allow"
    DENY = "deny"
    CHALLENGE = "challenge"
    MONITOR = "monitor"


class Policy(Base):
    __tablename__ = "policies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    policy_type = Column(SQLEnum(PolicyType), nullable=False)
    action = Column(SQLEnum(PolicyAction), default=PolicyAction.MONITOR, nullable=False)
    priority = Column(Integer, default=100, nullable=False)  # Lower = higher priority
    is_active = Column(Boolean, default=True, nullable=False)

    # Conditions (JSON)
    conditions = Column(JSON, nullable=False)  # Rule conditions

    # Risk thresholds
    min_risk_score = Column(Float, default=0.0, nullable=False)
    max_risk_score = Column(Float, default=100.0, nullable=False)
    min_trust_score = Column(Float, default=0.0, nullable=False)
    max_trust_score = Column(Float, default=100.0, nullable=False)

    # Scope
    applies_to_roles = Column(JSON, nullable=True)  # List of role names
    applies_to_devices = Column(JSON, nullable=True)  # List of device IDs or "all"
    applies_to_networks = Column(JSON, nullable=True)  # List of CIDR ranges

    # Metadata
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])
    evaluations = relationship("PolicyEvaluation", back_populates="policy", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_policies_type_active", "policy_type", "is_active"),
        Index("ix_policies_priority", "priority"),
    )


class PolicyEvaluation(Base):
    __tablename__ = "policy_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("policies.id", ondelete="CASCADE"), nullable=False)
    decision = Column(SQLEnum(PolicyAction), nullable=False)
    matched_conditions = Column(JSON, nullable=True)
    risk_score = Column(Float, nullable=True)
    trust_score = Column(Float, nullable=True)
    context = Column(JSON, nullable=True)  # Evaluation context
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    policy = relationship("Policy", back_populates="evaluations")

    __table_args__ = (
        Index("ix_policy_eval_policy_created", "policy_id", "created_at"),
        Index("ix_policy_eval_decision", "decision"),
    )