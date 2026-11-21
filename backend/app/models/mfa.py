from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class MFAMethod(str, enum.Enum):
    TOTP = "totp"
    SMS = "sms"
    EMAIL = "email"
    BACKUP_CODES = "backup_codes"


class MFAConfig(Base):
    __tablename__ = "mfa_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)

    # TOTP
    totp_secret = Column(String(64), nullable=True)
    totp_enabled = Column(Boolean, default=False, nullable=False)
    totp_verified_at = Column(DateTime(timezone=True), nullable=True)

    # Backup codes
    backup_codes = Column(Text, nullable=True)  # JSON array of hashed codes
    backup_codes_used = Column(Text, nullable=True)  # JSON array of used codes

    # SMS
    phone_number = Column(String(30), nullable=True)
    phone_verified = Column(Boolean, default=False, nullable=False)

    # Email
    email_verified = Column(Boolean, default=False, nullable=False)

    # Settings
    required_for_login = Column(Boolean, default=False, nullable=False)
    required_for_sensitive_actions = Column(Boolean, default=True, nullable=False)
    allowed_methods = Column(Text, nullable=True)  # JSON array of MFAMethod

    # Recovery
    recovery_email = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="mfa_config")

    __table_args__ = (
        Index("ix_mfa_config_user", "user_id"),
    )