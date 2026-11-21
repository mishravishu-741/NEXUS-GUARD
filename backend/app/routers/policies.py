from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, desc
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.policy import Policy, PolicyType, PolicyAction, PolicyEvaluation
from app.models.user import User
from app.models.audit_log import AuditLog, AuditAction, AuditResourceType
from app.schemas.policy import PolicyCreate, PolicyUpdate, PolicyResponse, PolicyListResponse, PolicyEvaluationRequest, PolicyEvaluationResponse
from app.routers.dependencies import get_current_user, get_current_admin_user, get_client_info
from app.services.zero_trust import evaluate_policies

router = APIRouter(prefix="/policies", tags=["Policies"])


@router.get("", response_model=PolicyListResponse)
async def list_policies(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    policy_type: Optional[PolicyType] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Policy)

    if search:
        query = query.where(
            or_(
                Policy.name.ilike(f"%{search}%"),
                Policy.description.ilike(f"%{search}%")
            )
        )

    if policy_type:
        query = query.where(Policy.policy_type == policy_type)

    if is_active is not None:
        query = query.where(Policy.is_active == is_active)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Apply pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    query = query.order_by(Policy.priority, Policy.created_at.desc())

    result = await db.execute(query)
    policies = result.scalars().all()

    return PolicyListResponse(
        policies=policies,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/{policy_id}", response_model=PolicyResponse)
async def get_policy(
    policy_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Policy).where(Policy.id == policy_id))
    policy = result.scalar_one_or_none()

    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    return policy


@router.post("", response_model=PolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_policy(
    policy_data: PolicyCreate,
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    client_info = get_client_info(request)

    policy = Policy(
        **policy_data.model_dump(),
        created_by=current_user.id,
        updated_by=current_user.id
    )
    db.add(policy)
    await db.commit()
    await db.refresh(policy)

    from app.routers.auth import create_audit_log
    await create_audit_log(
        db, AuditAction.CREATE, AuditResourceType.POLICY,
        resource_id=str(policy.id), resource_name=policy.name,
        user_id=current_user.id, ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
        new_values=policy_data.model_dump(),
        description=f"Admin {current_user.username} created policy {policy.name}"
    )

    return policy


@router.patch("/{policy_id}", response_model=PolicyResponse)
async def update_policy(
    policy_id: int,
    policy_data: PolicyUpdate,
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    client_info = get_client_info(request)

    result = await db.execute(select(Policy).where(Policy.id == policy_id))
    policy = result.scalar_one_or_none()

    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    old_values = {
        "name": policy.name,
        "description": policy.description,
        "policy_type": policy.policy_type.value,
        "action": policy.action.value,
        "priority": policy.priority,
        "is_active": policy.is_active,
        "conditions": policy.conditions,
        "min_risk_score": policy.min_risk_score,
        "max_risk_score": policy.max_risk_score,
        "min_trust_score": policy.min_trust_score,
        "max_trust_score": policy.max_trust_score,
        "applies_to_roles": policy.applies_to_roles,
        "applies_to_devices": policy.applies_to_devices,
        "applies_to_networks": policy.applies_to_networks
    }

    update_data = policy_data.model_dump(exclude_unset=True)
    changed_fields = []

    for field, value in update_data.items():
        if getattr(policy, field) != value:
            changed_fields.append(field)
            setattr(policy, field, value)

    if changed_fields:
        policy.updated_by = current_user.id
        policy.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(policy)

        new_values = {field: getattr(policy, field) for field in changed_fields}

        from app.routers.auth import create_audit_log
        await create_audit_log(
            db, AuditAction.UPDATE, AuditResourceType.POLICY,
            resource_id=str(policy.id), resource_name=policy.name,
            user_id=current_user.id, ip_address=client_info["ip"],
            user_agent=client_info["user_agent"],
            old_values=old_values, new_values=new_values,
            changed_fields=changed_fields,
            description=f"Admin {current_user.username} updated policy {policy.name}"
        )

    return policy


@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_policy(
    policy_id: int,
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    client_info = get_client_info(request)

    result = await db.execute(select(Policy).where(Policy.id == policy_id))
    policy = result.scalar_one_or_none()

    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    name = policy.name
    await db.delete(policy)
    await db.commit()

    from app.routers.auth import create_audit_log
    await create_audit_log(
        db, AuditAction.DELETE, AuditResourceType.POLICY,
        resource_id=str(policy_id), resource_name=name,
        user_id=current_user.id, ip_address=client_info["ip"],
        user_agent=client_info["user_agent"],
        description=f"Admin {current_user.username} deleted policy {name}"
    )


@router.post("/evaluate", response_model=PolicyEvaluationResponse)
async def evaluate_policy(
    eval_request: PolicyEvaluationRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    client_info = get_client_info(request)

    # Use the zero trust engine to evaluate policies
    result = await evaluate_policies(
        user_id=eval_request.user_id or current_user.id,
        device_id=eval_request.device_id,
        ip_address=eval_request.ip_address or client_info["ip"],
        user_agent=eval_request.user_agent or client_info["user_agent"],
        location=eval_request.location or client_info["location"],
        resource_type=eval_request.resource_type,
        resource_id=eval_request.resource_id,
        action=eval_request.action,
        risk_score=eval_request.risk_score,
        trust_score=eval_request.trust_score,
        db=db
    )

    return result