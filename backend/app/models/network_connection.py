from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Enum as SQLEnum, Text, Index, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum


class ConnectionStatus(str, enum.Enum):
    ESTABLISHED = "established"
    LISTENING = "listening"
    TIME_WAIT = "time_wait"
    CLOSE_WAIT = "close_wait"
    SYN_SENT = "syn_sent"
    SYN_RECEIVED = "syn_received"
    FIN_WAIT = "fin_wait"
    CLOSED = "closed"


class NetworkConnection(Base):
    __tablename__ = "network_connections"

    id = Column(Integer, primary_key=True, index=True)

    # Connection details
    local_address = Column(String(45), nullable=False)  # IP:port
    local_port = Column(Integer, nullable=False)
    remote_address = Column(String(45), nullable=True)  # IP:port
    remote_port = Column(Integer, nullable=True)
    protocol = Column(String(10), nullable=False)  # tcp, udp
    status = Column(SQLEnum(ConnectionStatus), nullable=False)

    # Process info
    pid = Column(Integer, nullable=True)
    process_name = Column(String(255), nullable=True)
    process_user = Column(String(100), nullable=True)

    # Network interface
    interface = Column(String(100), nullable=True)

    # Metadata
    connection_metadata = Column("metadata", JSON, nullable=True)

    # Timestamps
    first_seen = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_network_conn_local", "local_address", "local_port"),
        Index("ix_network_conn_remote", "remote_address", "remote_port"),
        Index("ix_network_conn_status", "status"),
        Index("ix_network_conn_pid", "pid"),
        Index("ix_network_conn_created", "created_at"),
    )