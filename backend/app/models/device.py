from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text, Index, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class DeviceStatus(str, enum.Enum):
    TRUSTED = "trusted"
    UNTRUSTED = "untrusted"
    PENDING = "pending"
    REVOKED = "revoked"


class DeviceType(str, enum.Enum):
    DESKTOP = "desktop"
    LAPTOP = "laptop"
    MOBILE = "mobile"
    TABLET = "tablet"
    SERVER = "server"
    IOT = "iot"
    UNKNOWN = "unknown"


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(64), unique=True, index=True, nullable=False)  # Unique device fingerprint
    name = Column(String(255), nullable=False)
    device_type = Column(SQLEnum(DeviceType), default=DeviceType.UNKNOWN, nullable=False)
    status = Column(SQLEnum(DeviceStatus), default=DeviceStatus.PENDING, nullable=False)
    trust_score = Column(Float, default=0.0, nullable=False)  # 0.0 to 100.0
    risk_score = Column(Float, default=0.0, nullable=False)   # 0.0 to 100.0

    # Device identification
    os_name = Column(String(100), nullable=True)
    os_version = Column(String(100), nullable=True)
    browser_name = Column(String(100), nullable=True)
    browser_version = Column(String(100), nullable=True)
    user_agent = Column(Text, nullable=True)
    screen_resolution = Column(String(50), nullable=True)
    timezone = Column(String(50), nullable=True)
    language = Column(String(10), nullable=True)

    # Network info
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    mac_address = Column(String(17), nullable=True)
    location = Column(String(255), nullable=True)

    # Ownership
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    revoked_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_reason = Column(Text, nullable=True)

    # Timestamps
    first_seen = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    owner = relationship("User", back_populates="devices", foreign_keys=[owner_id])
    approver = relationship("User", foreign_keys=[approved_by])
    revoker = relationship("User", foreign_keys=[revoked_by])
    security_events = relationship("SecurityEvent", back_populates="device")
    access_decisions = relationship("AccessDecision", back_populates="device")

    __table_args__ = (
        Index("ix_devices_owner_status", "owner_id", "status"),
        Index("ix_devices_status_trust", "status", "trust_score"),
        Index("ix_devices_last_seen", "last_seen"),
    )