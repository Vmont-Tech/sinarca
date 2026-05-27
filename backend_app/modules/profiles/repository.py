from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import cast as typing_cast

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.roles import UserRole
from backend_app.db.models import Organization, Profile


@dataclass
class ProfileRecord:
    id: str
    name: str
    email: str
    document: str
    role: UserRole
    password_hash: str
    organization: str | None = None
    phone: str | None = None
    avatar: str | None = None
    govLevel: str | None = None

    def public_dict(self) -> dict[str, str | None]:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "document": self.document,
            "role": self.role,
            "organization": self.organization,
            "phone": self.phone,
            "avatar": self.avatar,
            "govLevel": self.govLevel,
        }


class SQLAlchemyProfileRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, user_id: str) -> ProfileRecord | None:
        result = await self.session.execute(select(Profile).where(_profile_identity_filter(user_id)))
        profile = result.scalar_one_or_none()
        return await self._record_from_profile(profile) if profile is not None else None

    async def get_profile_model(self, user_id: str) -> Profile | None:
        result = await self.session.execute(select(Profile).where(_profile_identity_filter(user_id)))
        return result.scalar_one_or_none()

    async def get_by_login(self, login: str) -> ProfileRecord | None:
        normalized = login.strip().lower()
        result = await self.session.execute(
            select(Profile).where(
                or_(
                    Profile.email.ilike(normalized),
                    Profile.document == normalized,
                )
            )
        )
        profile = result.scalar_one_or_none()
        return await self._record_from_profile(profile) if profile is not None else None

    async def email_exists(self, email: str) -> bool:
        normalized = email.strip().lower()
        result = await self.session.execute(select(Profile.id).where(Profile.email.ilike(normalized)))
        return result.scalar_one_or_none() is not None

    async def create(
        self,
        *,
        name: str,
        email: str,
        document: str,
        role: UserRole,
        password_hash_value: str,
        organization: str | None = None,
        phone: str | None = None,
        avatar: str | None = None,
    ) -> ProfileRecord:
        profile = Profile(
            external_id=f"user-{email.strip().lower()}",
            name=name,
            email=email.strip().lower(),
            document=document,
            role=role,
            password_hash=password_hash_value,
            phone=phone,
            avatar_url=avatar,
        )
        self.session.add(profile)
        await self.session.flush()
        if organization:
            await self._upsert_profile_organization(profile, organization)
            await self.session.flush()
        return await self._record_from_profile(profile)

    async def update(self, user_id: str, **updates: str | None) -> ProfileRecord | None:
        result = await self.session.execute(select(Profile).where(_profile_identity_filter(user_id)))
        profile = result.scalar_one_or_none()
        if profile is None:
            return None

        organization_name = updates.pop("organization", None)
        if organization_name is not None:
            await self._upsert_profile_organization(profile, organization_name)

        field_map = {"avatar": "avatar_url", "govLevel": "gov_level"}
        for field, value in updates.items():
            model_field = field_map.get(field, field)
            if value is not None and hasattr(profile, model_field):
                setattr(profile, model_field, value)
        await self.session.flush()
        return await self._record_from_profile(profile)

    async def _record_from_profile(self, profile: Profile) -> ProfileRecord:
        organization_name: str | None = None
        if profile.organization_id is not None:
            result = await self.session.execute(select(Organization.name).where(Organization.id == profile.organization_id))
            organization_name = result.scalar_one_or_none()
        return _record_from_model(profile, organization_name)

    async def _upsert_profile_organization(self, profile: Profile, organization_name: str) -> None:
        normalized_name = organization_name.strip()
        if not normalized_name:
            return

        if profile.organization_id is not None:
            result = await self.session.execute(select(Organization).where(Organization.id == profile.organization_id))
            organization = result.scalar_one_or_none()
            if organization is not None:
                organization.name = normalized_name
                return

        external_id = f"{profile.external_id or profile.id}-organization"
        result = await self.session.execute(select(Organization).where(Organization.external_id == external_id))
        organization = result.scalar_one_or_none()
        if organization is None:
            organization = Organization(
                external_id=external_id,
                name=normalized_name,
                role=_organization_role_for_profile(profile.role),
                document=profile.document,
                authorized=False,
            )
            self.session.add(organization)
            await self.session.flush()
        else:
            organization.name = normalized_name
        profile.organization_id = organization.id


def get_profile_repository(session: AsyncSession) -> SQLAlchemyProfileRepository:
    return SQLAlchemyProfileRepository(session)


def _record_from_model(profile: Profile, organization_name: str | None = None) -> ProfileRecord:
    return ProfileRecord(
        id=profile.external_id or str(profile.id),
        name=profile.name,
        email=profile.email,
        document=profile.document or "",
        role=typing_cast(UserRole, profile.role),
        password_hash=profile.password_hash,
        organization=organization_name,
        phone=profile.phone,
        avatar=profile.avatar_url,
        govLevel=profile.gov_level,
    )


def _organization_role_for_profile(role: str) -> str:
    return {
        "producer": "Producer",
        "auditor": "Auditor",
        "company": "Compensator",
        "certifier": "Certifier",
        "admin": "Registry",
    }.get(role, "Compensator")


def _profile_identity_filter(user_id: str):
    filters = [Profile.external_id == user_id]
    try:
        filters.append(Profile.id == uuid.UUID(user_id))
    except ValueError:
        pass
    return or_(*filters)
