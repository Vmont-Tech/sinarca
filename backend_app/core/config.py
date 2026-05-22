from __future__ import annotations

from functools import lru_cache

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5680",
]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        enable_decoding=False,
        extra="ignore",
    )

    app_env: str = "development"
    port: int = 5680
    public_web_url: str = "http://localhost:5173"
    cors_origins: list[str] = Field(default_factory=list)
    database_url: str = "dev-database-url"
    jwt_secret_key: str = "dev-jwt-secret-key-for-local-tests-32bytes"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    refresh_token_days: int = 7
    allow_demo_auth_fallback: bool = False
    stellar_network: str = "testnet"
    etherfuse_api_url: str | None = None
    polygon_rpc_url: str | None = None

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: object) -> list[str] | object:
        if value is None or value == "":
            return []
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @model_validator(mode="after")
    def validate_production_secrets(self) -> "Settings":
        if self.app_env.strip().lower() != "production":
            if not self.cors_origins:
                self.cors_origins = DEFAULT_CORS_ORIGINS.copy()
            return self

        invalid: list[str] = []
        if not self.jwt_secret_key or self.jwt_secret_key.startswith("dev-"):
            invalid.append("JWT_SECRET_KEY")
        if not self.database_url or self.database_url.startswith("dev-"):
            invalid.append("DATABASE_URL")
        if not self.cors_origins or any(origin.startswith("dev-") for origin in self.cors_origins):
            invalid.append("CORS_ORIGINS")

        if invalid:
            joined = ", ".join(invalid)
            raise ValueError(f"Configuração de produção incompleta ou insegura: {joined}")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
