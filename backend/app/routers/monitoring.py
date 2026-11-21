from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.monitoring import MonitoringService
from app.routers.dependencies import get_current_user, get_current_admin_user
from app.models.user import User

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


@router.get("/metrics")
async def get_system_metrics(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    monitoring = MonitoringService(db)
    metrics = await monitoring.collect_system_metrics()
    return metrics


@router.get("/connections")
async def get_network_connections(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    monitoring = MonitoringService(db)
    connections = await monitoring.monitor_network_connections()
    return connections


@router.get("/stats")
async def get_network_stats(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    monitoring = MonitoringService(db)
    stats = await monitoring.get_network_stats()
    return stats


@router.get("/processes")
async def get_process_list(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    monitoring = MonitoringService(db)
    processes = await monitoring.get_process_list()
    return processes


@router.get("/ports")
async def get_listening_ports(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    monitoring = MonitoringService(db)
    ports = await monitoring.check_port_changes()
    return ports