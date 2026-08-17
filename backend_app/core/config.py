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
    stellar_network: str = "testnet"
    etherfuse_api_url: str | None = None
    polygon_rpc_url: str | None = None
    supabase_url: str | None = None
    supabase_public_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_service_role_key: str | None = None
    supabase_jwt_secret: str | None = None

    # Phase 04.2 / D-10: limiares de severidade de overlap (Bible secao 16).
    # Interpretacao: pct <= 0 -> CLEAR; <= info -> INFO; <= low -> LOW;
    # <= medium -> MEDIUM; <= high -> HIGH; > high -> CRITICAL.
    integrity_overlap_severity_info_pct: float = 1.0
    integrity_overlap_severity_low_pct: float = 5.0
    integrity_overlap_severity_medium_pct: float = 20.0
    integrity_overlap_severity_high_pct: float = 50.0

    # Phase 04.2 / D-13: pesos dos sinais de risco (Bible secao 22).
    integrity_risk_weight_overlap_critical: float = 50.0
    integrity_risk_weight_overlap_high: float = 30.0
    integrity_risk_weight_overlap_medium: float = 15.0
    integrity_risk_weight_overlap_low: float = 5.0
    integrity_risk_weight_double_claim: float = 60.0
    integrity_risk_weight_land_claim_unverified: float = 20.0
    integrity_risk_weight_claim_evidence_pending: float = 10.0
    integrity_risk_weight_possession_without_title: float = 10.0

    # Phase 05 / D-20: peso do sinal de anomalia satelital confirmada
    # (mesmo padrao configuravel dos demais sinais de D-13/Phase 04.2).
    integrity_risk_weight_satellite_anomaly_critical: float = 50.0
    integrity_risk_weight_satellite_anomaly_high: float = 30.0

    # Phase 05 / D-12: janela da reconstrucao historica (anos anteriores a
    # projects.created_at), granularidade mensal (~60 pontos em 5 anos).
    satellite_historical_years: int = 5

    # Phase 05 / D-13: maxCloudCoverage bloqueia observacoes acima do limite;
    # preferencia documentada por cenas abaixo de satellite_preferred_cloud_coverage_pct.
    satellite_max_cloud_coverage_pct: float = 20.0
    satellite_preferred_cloud_coverage_pct: float = 10.0

    # Phase 05 / D-17: queda relativa de NDVI entre observacoes mensais
    # consecutivas que dispara SatelliteAnomaly (0.15 = queda de 15%).
    satellite_ndvi_drop_threshold: float = 0.15
    satellite_ndvi_recovery_threshold: float = 0.15
    # Queda relativa de NBR que caracteriza assinatura de fogo (POSSIBLE_FIRE).
    satellite_nbr_fire_threshold: float = 0.27

    # Phase 05 / D-14: scheduler in-process (APScheduler). O poller consome a
    # fila persistida em satellite_jobs; o job periodico enfileira monitoramento.
    satellite_scheduler_enabled: bool = True
    satellite_job_poll_seconds: int = 30
    satellite_monitoring_interval_hours: int = 24
    # D-11: quota gratuita CDSE permite 2 requests concorrentes; o lote de
    # projetos por ciclo nunca dispara mais que isso em paralelo.
    satellite_monitoring_batch_size: int = 5
    copernicus_max_concurrent_requests: int = 2
    copernicus_request_timeout_seconds: float = 30.0

    # COPERNICUS_CLIENT_ID/COPERNICUS_CLIENT_SECRET NAO ficam em Settings:
    # sao lidos por os.getenv em CopernicusAdapterConfig.from_env() (Plan 03),
    # mesmo padrao fail-closed de backend_app/adapters/stellar.py.

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
