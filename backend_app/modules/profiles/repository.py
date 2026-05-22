from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from backend_app.core.roles import UserRole
from backend_app.core.security import hash_password


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


def get_profile_repository() -> InMemoryProfileRepository:
    return profile_repository


def reset_profile_repository() -> None:
    profile_repository.reset()


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
