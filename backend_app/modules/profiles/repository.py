from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Iterable, cast as typing_cast

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.core.config import get_settings
from backend_app.core.roles import UserRole
from backend_app.core.security import hash_password
from backend_app.db.models import Profile
from backend_app.db.session import is_database_configured


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


class InMemoryProfileRepository:
    def __init__(self) -> None:
        self._profiles: dict[str, ProfileRecord] = {}
        self.reset()

    def reset(self) -> None:
        self._profiles = {}
        for seed in _seed_profiles():
            self._profiles[seed.id] = seed

    def list(self) -> Iterable[ProfileRecord]:
        return self._profiles.values()

    def get_by_id(self, user_id: str) -> ProfileRecord | None:
        return self._profiles.get(user_id)

    def get_by_login(self, login: str) -> ProfileRecord | None:
        normalized = login.strip().lower()
        return next(
            (
                profile
                for profile in self._profiles.values()
                if profile.email.lower() == normalized or profile.document.lower() == normalized
            ),
            None,
        )

    def email_exists(self, email: str) -> bool:
        normalized = email.strip().lower()
        return any(profile.email.lower() == normalized for profile in self._profiles.values())

    def create(
        self,
        *,
        name: str,
        email: str,
        document: str,
        role: UserRole,
        password_hash_value: str,
    ) -> ProfileRecord:
        user_id = f"user-{len(self._profiles) + 1:03d}"
        profile = ProfileRecord(
            id=user_id,
            name=name,
            email=email,
            document=document,
            role=role,
            password_hash=password_hash_value,
        )
        self._profiles[profile.id] = profile
        return profile

    def update(self, user_id: str, **updates: str | None) -> ProfileRecord | None:
        profile = self.get_by_id(user_id)
        if profile is None:
            return None
        for field, value in updates.items():
            if value is not None and hasattr(profile, field):
                setattr(profile, field, value)
        return profile


class SQLAlchemyProfileRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, user_id: str) -> ProfileRecord | None:
        result = await self.session.execute(select(Profile).where(_profile_identity_filter(user_id)))
        profile = result.scalar_one_or_none()
        return _record_from_model(profile) if profile is not None else None

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
        return _record_from_model(profile) if profile is not None else None

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
    ) -> ProfileRecord:
        profile = Profile(
            external_id=f"user-{email.strip().lower()}",
            name=name,
            email=email.strip().lower(),
            document=document,
            role=role,
            password_hash=password_hash_value,
        )
        self.session.add(profile)
        await self.session.flush()
        return _record_from_model(profile)

    async def update(self, user_id: str, **updates: str | None) -> ProfileRecord | None:
        result = await self.session.execute(select(Profile).where(_profile_identity_filter(user_id)))
        profile = result.scalar_one_or_none()
        if profile is None:
            return None

        field_map = {"avatar": "avatar_url", "govLevel": "gov_level"}
        for field, value in updates.items():
            model_field = field_map.get(field, field)
            if value is not None and hasattr(profile, model_field):
                setattr(profile, model_field, value)
        await self.session.flush()
        return _record_from_model(profile)


def get_profile_repository(session: AsyncSession | None = None) -> InMemoryProfileRepository | SQLAlchemyProfileRepository:
    if session is not None:
        return SQLAlchemyProfileRepository(session)

    settings = get_settings()
    if is_database_configured(settings.database_url) and settings.app_env.strip().lower() == "production":
        raise RuntimeError("Repositório de perfis em memória bloqueado em produção; forneça AsyncSession")
    return profile_repository


def reset_profile_repository() -> None:
    settings = get_settings()
    if is_database_configured(settings.database_url) and settings.app_env.strip().lower() == "production":
        raise RuntimeError("Reset do repositório em memória bloqueado em produção")
    profile_repository.reset()


def _record_from_model(profile: Profile) -> ProfileRecord:
    return ProfileRecord(
        id=profile.external_id or str(profile.id),
        name=profile.name,
        email=profile.email,
        document=profile.document or "",
        role=typing_cast(UserRole, profile.role),
        password_hash=profile.password_hash,
        organization=None,
        phone=profile.phone,
        avatar=profile.avatar_url,
        govLevel=profile.gov_level,
    )


def _profile_identity_filter(user_id: str):
    filters = [Profile.external_id == user_id]
    try:
        filters.append(Profile.id == uuid.UUID(user_id))
    except ValueError:
        pass
    return or_(*filters)


def _seed_profiles() -> list[ProfileRecord]:
    return [
        _seed_profile("prod-001", "Produtor Demo", "produtor@sinarca.com.br", "222.222.222-22", "producer", "produtor"),
        _seed_profile("aud-005", "Auditor Demo", "auditor@sinarca.com.br", "11.111.111-11", "auditor", "auditor"),
        _seed_profile(
            "std-001",
            "Certificadora Demo",
            "certificadora@sinarca.com.br",
            "44.444.444/0001-44",
            "certifier",
            "certificadora",
        ),
        _seed_profile("comp-001", "Banco Futuro", "empresa@sinarca.com.br", "33.333.333/0001-33", "company", "empresa"),
        _seed_profile("admin-001", "Admin SINARCA", "admin@sinarca.com.br", "00.000.000/0001-00", "admin", "admin"),
    ]


def _seed_profile(
    user_id: str,
    name: str,
    email: str,
    document: str,
    role: UserRole,
    password: str,
) -> ProfileRecord:
    return ProfileRecord(
        id=user_id,
        name=name,
        email=email,
        document=document,
        role=role,
        password_hash=hash_password(password),
    )


profile_repository = InMemoryProfileRepository()
