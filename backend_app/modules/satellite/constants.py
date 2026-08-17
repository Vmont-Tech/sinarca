from __future__ import annotations

# Vocabulario canonico do monitoramento satelital Sinarca (Phase 05, Bible secao 40).
# Estas tuplas sao a fonte unica de verdade: os check constraints das migrations
# 202608180001, 202608180002 e 202608180003 espelham exatamente estas listas.
# Convencao do repo desde a Phase 04: text + check no SQL, String em models.py.
# NUNCA criar tipo ENUM novo no Postgres para estes campos.

SATELLITE_PROVIDERS: tuple[str, ...] = ("COPERNICUS",)
SATELLITE_PLATFORMS: tuple[str, ...] = ("SENTINEL_2",)
SATELLITE_PRODUCTS: tuple[str, ...] = ("L2A",)
SATELLITE_INDEX_NAMES: tuple[str, ...] = ("NDVI", "NDMI", "NBR")

# D-17: SatelliteAnomaly nasce em PENDING_ANALYSIS. LINKED = ja vinculada a um
# ProjectEvent pelo Correlation Engine.
SATELLITE_ANOMALY_STATUSES: tuple[str, ...] = (
    "PENDING_ANALYSIS",
    "ANALYZED",
    "LINKED",
    "DISMISSED",
)

# D-17: nunca DEFORESTATION automatico. Vocabulario inicial FECHADO.
PROJECT_EVENT_TYPES: tuple[str, ...] = (
    "VEGETATION_LOSS",
    "VEGETATION_RECOVERY",
    "POSSIBLE_FIRE",
)

# D-18: DETECTED -> ANALYZED -> CONFIRMED/DISMISSED.
# Nunca existe transicao automatica direta DETECTED -> CONFIRMED.
PROJECT_EVENT_STATUSES: tuple[str, ...] = (
    "DETECTED",
    "ANALYZED",
    "CONFIRMED",
    "DISMISSED",
)
PROJECT_EVENT_TRANSITIONS: dict[str, tuple[str, ...]] = {
    "DETECTED": ("ANALYZED", "DISMISSED"),
    "ANALYZED": ("CONFIRMED", "DISMISSED"),
    "CONFIRMED": (),
    "DISMISSED": (),
}

PROJECT_EVENT_SEVERITIES: tuple[str, ...] = ("LOW", "MEDIUM", "HIGH", "CRITICAL")
# D-20: so severidade HIGH/CRITICAL confirmada vira sinal de risco.
PROJECT_EVENT_RISK_SEVERITIES: tuple[str, ...] = ("HIGH", "CRITICAL")

# D-17: faixas de severidade por queda relativa de NDVI. Mesmo formato de
# RISK_CLASS_BOUNDS (integrity/constants.py:96-103): primeiro limite >= valor.
NDVI_DROP_SEVERITY_BOUNDS: tuple[tuple[float, str], ...] = (
    (0.25, "LOW"),
    (0.35, "MEDIUM"),
    (0.50, "HIGH"),
    (1.00, "CRITICAL"),
)

SATELLITE_JOB_TYPES: tuple[str, ...] = ("HISTORICAL_RECONSTRUCTION", "CONTINUOUS_MONITORING")
# D-14: estados persistidos do job assincrono.
SATELLITE_JOB_STATUSES: tuple[str, ...] = ("PENDING", "PROCESSING", "COMPLETED", "FAILED")
SATELLITE_JOB_ACTIVE_STATUSES: tuple[str, ...] = ("PENDING", "PROCESSING")

# D-19: evidencia visual so e buscada quando a anomalia chega a ANALYZED.
SATELLITE_EVIDENCE_KINDS: tuple[str, ...] = ("BEFORE_IMAGE", "AFTER_IMAGE", "STATISTICS_SNAPSHOT")

# D-26: observabilidade de consumo como linhas estruturadas (sem Prometheus nesta fase).
COPERNICUS_USAGE_ENDPOINTS: tuple[str, ...] = ("TOKEN", "STAC_SEARCH", "STATISTICS", "PROCESS")
COPERNICUS_USAGE_OUTCOMES: tuple[str, ...] = ("SUCCESS", "ERROR")

# D-23: pendencia de revisao manual de credito, analoga a certification_pendencies.
CREDIT_ADJUSTMENT_PENDENCY_STATUSES: tuple[str, ...] = ("OPEN", "RESOLVED", "CANCELLED")
CREDIT_ADJUSTMENT_PENDENCY_CATEGORY = "SATELLITE_INCIDENT"

# D-07/D-25: valor gravado em projects.metadata.baseline_source quando o
# baseline exibido passa a vir de observacao Sentinel-2 real.
BASELINE_SOURCE_COPERNICUS = "COPERNICUS"
BASELINE_SOURCE_DETERMINISTIC = "deterministic_baseline"
SENTINEL_STATUS_BLOCKED = "BLOCKED_MISSING_PROVIDER_CREDENTIALS"
SENTINEL_STATUS_ACTIVE = "ACTIVE_COPERNICUS_SENTINEL_2"

# Guarda explicita da regra de aceite SATM-06: este rotulo NUNCA pode ser
# produzido automaticamente por nenhum caminho de codigo desta fase.
FORBIDDEN_AUTOMATIC_EVENT_TYPES: frozenset[str] = frozenset({"DEFORESTATION"})
