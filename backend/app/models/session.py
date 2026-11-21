from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class SessionStatus(str, enum.Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"
    LOGOUT = "logout"


class LoginSession(Base):
    __tablename__ = "login_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_token = Column(String(128), unique=True, index=True, nullable=False)
    refresh_token_hash = Column(String(255), nullable=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    device_id = Column(Integer, ForeignKey("devices.id", ondelete="SET NULL"), nullable=True, index=True)

    status = Column(SQLEnum(SessionStatus), default=SessionStatus.ACTIVE, nullable=False)

    # Connection info
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    location = Column(String(255), nullable=True)

    # MFA
    mfa_verified = Column(Boolean, default=False, nullable=False)
    mfa_method = Column(String(50), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_activity = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_reason = Column(Text, nullable=True)

    # Relationships
    user = relationship("User", back_populates="sessions")
    device = relationship("Device")

    __table_args__ = (
        Index("ix_sessions_user_status", "user_id", "status"),
        Index("ix_sessions_expires", "expires_at"),
        Index("ix_sessions_token", "session_token"),
    )