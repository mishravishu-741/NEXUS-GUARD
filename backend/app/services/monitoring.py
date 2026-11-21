from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
import json
import psutil
import socket

from app.models.security_event import SecurityEvent, SecurityEventType, SecurityEventSeverity
from app.models.device import Device
from app.models.network_connection import NetworkConnection
from app.routers.auth import create_security_event


class MonitoringService:
    """
    Network and system monitoring service
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def collect_system_metrics(self) -> Dict[str, Any]:
        """
        Collect system-level metrics
        """
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            network = psutil.net_io_counters()

            return {
                "timestamp": datetime.utcnow().isoformat(),
                "cpu": {
                    "percent": cpu_percent,
                    "count": psutil.cpu_count()
                },
                "memory": {
                    "total": memory.total,
                    "available": memory.available,
                    "percent": memory.percent,
                    "used": memory.used
                },
                "disk": {
                    "total": disk.total,
                    "used": disk.used,
                    "free": disk.free,
                    "percent": (disk.used / disk.total) * 100
                },
                "network": {
                    "bytes_sent": network.bytes_sent,
                    "bytes_recv": network.bytes_recv,
                    "packets_sent": network.packets_sent,
                    "packets_recv": network.packets_recv
                }
            }
        except Exception as e:
            return {"error": str(e), "timestamp": datetime.utcnow().isoformat()}

    async def monitor_network_connections(self) -> List[Dict[str, Any]]:
        """
        Monitor active network connections
        Only monitors local system connections
        """
        connections = []

        try:
            for conn in psutil.net_connections(kind='inet'):
                if conn.status == 'ESTABLISHED':
                    local_addr = f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else "unknown"
                    remote_addr = f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else "unknown"

                    # Get process info
                    process_name = "unknown"
                    try:
                        if conn.pid:
                            process = psutil.Process(conn.pid)
                            process_name = process.name()
                    except:
                        pass

                    connection_data = {
                        "local_address": local_addr,
                        "remote_address": remote_addr,
                        "status": conn.status,
                        "pid": conn.pid,
                        "process_name": process_name,
                        "family": conn.family.name if conn.family else "unknown",
                        "type": conn.type.name if conn.type else "unknown",
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    connections.append(connection_data)

                    # Check for suspicious connections
                    await self._analyze_connection(connection_data)

        except Exception as e:
            pass  # Silently fail on permission errors

        return connections

    async def _analyze_connection(self, conn_data: Dict[str, Any]):
        """
        Analyze a network connection for suspicious activity
        """
        remote_ip = conn_data["remote_address"].split(":")[0] if ":" in conn_data["remote_address"] else ""

        # Check against known suspicious IPs (from threat alerts)
        from app.models.threat_alert import ThreatAlert, ThreatType, ThreatStatus
        result = await self.db.execute(
            select(ThreatAlert).where(
                ThreatAlert.ip_address == remote_ip,
                ThreatAlert.status.in_([ThreatStatus.OPEN, ThreatStatus.INVESTIGATING]),
                ThreatAlert.threat_type.in_([
                    ThreatType.MALICIOUS_IP, ThreatType.TOR_EXIT_NODE,
                    ThreatType.VPN_PROXY, ThreatType.ANONYMOUS_PROXY
                ])
            )
        )
        threat = result.scalar_one_or_none()

        if threat:
            await create_security_event(
                self.db,
                SecurityEventType.NETWORK_ANOMALY,
                SecurityEventSeverity.HIGH,
                f"Connection to known threat IP",
                f"Process {conn_data['process_name']} (PID: {conn_data['pid']}) connected to {remote_ip}",
                ip_address=remote_ip,
                connection_metadata={
                    "local_address": conn_data["local_address"],
                    "remote_address": conn_data["remote_address"],
                    "process_name": conn_data["process_name"],
                    "pid": conn_data["pid"],
                    "threat_type": threat.threat_type.value
                },
                risk_score=80
            )

        # Check for connections to unusual ports
        suspicious_ports = {22, 23, 3389, 5900, 4444, 31337, 12345, 54321}
        try:
            remote_port = int(conn_data["remote_address"].split(":")[-1]) if ":" in conn_data["remote_address"] else 0
            if remote_port in suspicious_ports:
                await create_security_event(
                    self.db,
                    SecurityEventType.NETWORK_ANOMALY,
                    SecurityEventSeverity.MEDIUM,
                    f"Connection to suspicious port",
                    f"Process {conn_data['process_name']} connected to port {remote_port} on {remote_ip}",
                    ip_address=remote_ip,
                    connection_metadata={
                        "local_address": conn_data["local_address"],
                        "remote_address": conn_data["remote_address"],
                        "process_name": conn_data["process_name"],
                        "pid": conn_data["pid"],
                        "suspicious_port": remote_port
                    },
                    risk_score=40
                )
        except:
            pass

    async def get_network_stats(self) -> Dict[str, Any]:
        """
        Get network statistics
        """
        try:
            net_io = psutil.net_io_counters(pernic=True)
            interfaces = {}

            for name, stats in net_io.items():
                interfaces[name] = {
                    "bytes_sent": stats.bytes_sent,
                    "bytes_recv": stats.bytes_recv,
                    "packets_sent": stats.packets_sent,
                    "packets_recv": stats.packets_recv,
                    "errin": stats.errin,
                    "errout": stats.errout,
                    "dropin": stats.dropin,
                    "dropout": stats.dropout
                }

            return {
                "timestamp": datetime.utcnow().isoformat(),
                "interfaces": interfaces,
                "total_connections": len(psutil.net_connections(kind='inet'))
            }
        except Exception as e:
            return {"error": str(e), "timestamp": datetime.utcnow().isoformat()}

    async def get_process_list(self) -> List[Dict[str, Any]]:
        """
        Get running processes with network connections
        """
        processes = []

        try:
            for proc in psutil.process_iter(['pid', 'name', 'username', 'cpu_percent', 'memory_percent']):
                try:
                    info = proc.info
                    # Get network connections for this process
                    conns = proc.net_connections(kind='inet')
                    established = [c for c in conns if c.status == 'ESTABLISHED']

                    if established:
                        info['network_connections'] = len(established)
                        info['remote_addresses'] = [
                            f"{c.raddr.ip}:{c.raddr.port}" for c in established if c.raddr
                        ]
                        processes.append(info)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue

        except Exception as e:
            pass

        return processes

    async def check_port_changes(self) -> List[Dict[str, Any]]:
        """
        Check for new listening ports (baseline comparison)
        """
        # In a real implementation, this would compare against a baseline
        # For now, return current listening ports
        listening_ports = []

        try:
            for conn in psutil.net_connections(kind='inet'):
                if conn.status == 'LISTEN':
                    local_addr = f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else "unknown"
                    process_name = "unknown"
                    try:
                        if conn.pid:
                            process = psutil.Process(conn.pid)
                            process_name = process.name()
                    except:
                        pass

                    listening_ports.append({
                        "address": local_addr,
                        "pid": conn.pid,
                        "process_name": process_name,
                        "timestamp": datetime.utcnow().isoformat()
                    })
        except:
            pass

        return listening_ports


async def start_monitoring_tasks(db: AsyncSession):
    """
    Start background monitoring tasks
    This would be called from a task scheduler (e.g., APScheduler, Celery Beat)
    """
    monitoring = MonitoringService(db)

    # Collect system metrics
    metrics = await monitoring.collect_system_metrics()

    # Monitor network connections
    connections = await monitoring.monitor_network_connections()

    # Get network stats
    net_stats = await monitoring.get_network_stats()

    # Check for port changes
    ports = await monitoring.check_port_changes()

    return {
        "system_metrics": metrics,
        "active_connections": len(connections),
        "network_stats": net_stats,
        "listening_ports": len(ports),
        "timestamp": datetime.utcnow().isoformat()
    }