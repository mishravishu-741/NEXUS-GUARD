from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc, and_
from typing import List, Optional
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.access_decision import AccessDecision, AccessDecisionType
from app.models.user import User, UserRole
from app.schemas.access_decision import AccessDecisionRequest, AccessDecisionResponse, AccessDecisionListResponse
from app.routers.dependencies import get_current_user, get_current_admin_user, get_client_info
from app.services.zero_trust import make_access_decision

router = APIRouter(prefix="/access-decisions", tags=["Access Decisions"])


@router.get("", response_model=AccessDecisionListResponse)
async def list_access_decisions(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    decision: Optional[AccessDecisionType] = None,
    user_id: Optional[int] = None,
    device_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(AccessDecision)

    # Non-admin users can only see their own decisions
    if current_user.role != UserRole.ADMIN:
        query = query.where(AccessDecision.user_id == current_user.id)
    elif user_id:
        query = query.where(AccessDecision.user_id == user_id)

    if decision:
        query = query.where(AccessDecision.decision == decision)

    if device_id:
        query = query.where(AccessDecision.device_id == device_id)

    if ip_address:
        query = query.where(AccessDecision.ip_address == ip_address)

    if start_date:
        query = query.where(AccessDecision.created_at >= start_date)

    if end_date:
        query = query.where(AccessDecision.created_at <= end_date)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(desc(AccessDecision.created_at))

    result = await db.execute(query)
    decisions = result.scalars().all()

    return AccessDecisionListResponse(
        decisions=decisions,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{decision_id}", response_model=AccessDecisionResponse)
async def get_access_decision(
    decision_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(AccessDecision).where(AccessDecision.id == decision_id))
    decision = result.scalar_one_or_none()

    if not decision:
        raise HTTPException(status_code=404, detail="Access decision not found")

    if current_user.role != UserRole.ADMIN and decision.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this decision")

    return decision


@router.post("/evaluate", response_model=AccessDecisionResponse)
async def evaluate_access(
    request_data: AccessDecisionRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    client_info = get_client_info(request)

    # Use the zero trust engine to make access decision
    result = await make_access_decision(
        user_id=request_data.user_id or current_user.id,
        device_id=request_data.device_id,
        ip_address=request_data.ip_address or client_info["ip"],
        user_agent=request_data.user_agent or client_info["user_agent"],
        location=request_data.location or client_info["location"],
        resource_type=request_data.resource_type,
        resource_id=request_data.resource_id,
        action=request_data.action,
        risk_score=request_data.risk_score,
        trust_score=request_data.trust_score,
        metadata=request_data.decision_metadata,
        db=db
    )

    return result