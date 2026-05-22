from __future__ import annotations

from typing import Any, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.db.models import AuditEvent, Base, IdempotencyKey, Profile

ModelT = TypeVar("ModelT", bound=Base)


async def get_by_id(session: AsyncSession, model: type[ModelT], item_id: Any) -> ModelT | None:
    return await session.get(model, item_id)


async def get_profile_by_email(session: AsyncSession, email: str) -> Profile | None:
    result = await session.execute(select(Profile).where(Profile.email.ilike(email.strip())))
    return result.scalar_one_or_none()


async def create_audit_event(
    session: AsyncSession,
    *,
    action: str,
    entity_type: str,
    entity_id: Any | None = None,
    actor_profile_id: Any | None = None,
    actor_role: str | None = None,
    before_data: dict[str, Any] | None = None,
    after_data: dict[str, Any] | None = None,
    metadata: dict[str, Any] | None = None,
) -> AuditEvent:
    event = AuditEvent(
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        actor_profile_id=actor_profile_id,
        actor_role=actor_role,
        before_data=before_data,
        after_data=after_data,
        metadata_=metadata or {},
    )
    session.add(event)
    await session.flush()
    return event


async def record_idempotency_key(
    session: AsyncSession,
    *,
    key: str,
    scope: str,
    request_hash: str,
    response_payload: dict[str, Any] | None = None,
    status: str = "RECORDED",
) -> IdempotencyKey:
    result = await session.execute(
        select(IdempotencyKey).where(
            IdempotencyKey.key == key,
            IdempotencyKey.scope == scope,
        )
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        existing.request_hash = request_hash
        existing.response_payload = response_payload
        existing.status = status
        await session.flush()
        return existing

    item = IdempotencyKey(
        key=key,
        scope=scope,
        request_hash=request_hash,
        response_payload=response_payload,
        status=status,
    )
    session.add(item)
    await session.flush()
    return item

