from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text, Index, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class AuditAction(str, enum.Enum):
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    EXPORT = "export"
    IMPORT = "import"
    APPROVE = "approve"
    REVOKE = "revoke"
    ENABLE = "enable"
    DISABLE = "disable"


class AuditResourceType(str, enum.Enum):
    USER = "user"
    DEVICE = "device"
    POLICY = "policy"
    SECURITY_EVENT = "security_event"
    THREAT_ALERT = "threat_alert"
    AUDIT_LOG = "audit_log"
    SESSION = "session"
    MFA = "mfa"
    CONFIG = "config"
    REPORT = "report"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(SQLEnum(AuditAction), nullable=False, index=True)
    resource_type = Column(SQLEnum(AuditResourceType), nullable=False, index=True)
    resource_id = Column(String(100), nullable=True, index=True)
    resource_name = Column(String(255), nullable=True)

    # Actor
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)

    # Details
    old_values = Column(JSON, nullable=True)
    new_values = Column(JSON, nullable=True)
    changed_fields = Column(JSON, nullable=True)
    description = Column(Text, nullable=True)

    # Result
    success = Column(Boolean, default=True, nullable=False)
    error_message = Column(Text, nullable=True)

    # Metadata
    audit_metadata = Column("metadata", JSON, nullable=True)
    correlation_id = Column(String(64), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs")

    __table_args__ = (
        Index("ix_audit_logs_action_resource", "action", "resource_type"),
        Index("ix_audit_logs_user_created", "user_id", "created_at"),
        Index("ix_audit_logs_resource", "resource_type", "resource_id"),
        Index("ix_audit_logs_correlation", "correlation_id"),
    )