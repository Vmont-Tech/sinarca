from __future__ import annotations

# Vocabulario canonico do Sinarca Integrity Layer (Phase 04.2).
# Estas tuplas sao a fonte unica de verdade: os check constraints das migrations
# 202608170001 e 202608170002 espelham exatamente estas listas.
# Convencao do repo desde a Phase 04: text + check no SQL, String em models.py.
# NUNCA criar tipo ENUM novo no Postgres para estes campos.

CLAIM_TYPE_LAND_OWNERSHIP = "LAND_OWNERSHIP"
CLAIM_TYPE_LAND_POSSESSION = "LAND_POSSESSION"
CLAIM_TYPE_RIGHT_TO_OPERATE = "RIGHT_TO_OPERATE"

CLAIM_TYPES: tuple[str, ...] = (
    "LAND_OWNERSHIP",
    "LAND_POSSESSION",
    "RIGHT_TO_OPERATE",
)

# D-03: todo Claim nasce DECLARED. VERIFIED existe no vocabulario mas NUNCA e
# atribuido nesta fase (exige verificacao independente => Phase 05.1).
CLAIM_STATUSES: tuple[str, ...] = (
    "DECLARED",
    "EVIDENCE_PENDING",
    "EVIDENCE_VERIFIED",
    "VERIFIED",
    "REJECTED",
    "SUPERSEDED",
)

CLAIM_CONFIDENCE_DECLARED = 10
CLAIM_CONFIDENCE_EVIDENCE_PENDING = 30
CLAIM_CONFIDENCE_EVIDENCE_VERIFIED = 60

EVIDENCE_SOURCE_TYPES: tuple[str, ...] = (
    "SELF_DECLARED",
    "THIRD_PARTY",
    "EXTERNAL_REGISTRY",
    "SATELLITE",
    "FIELD_AUDIT",
)

# D-08: sem integracao externa, o sistema so consegue executar estes dois
# metodos. Nenhum outro pode ser gravado ate a Phase 05.1.
EVIDENCE_VALIDATION_METHODS: tuple[str, ...] = (
    "HASH_INTEGRITY",
    "STRUCTURAL_COMPLETENESS",
)

EVIDENCE_VALIDATION_STATUSES: tuple[str, ...] = (
    "PENDING",
    "VERIFIED",
    "FAILED",
    "EXPIRED",
)

# Bible secao 6. Nesta fase somente GEOSPATIAL_OVERLAP (D-09) e DOUBLE_CLAIM
# (D-12) sao emitidos; os demais ficam no check para nao exigir migration nova.
CONFLICT_TYPES: tuple[str, ...] = (
    "GEOSPATIAL_OVERLAP",
    "DUPLICATE_PROPERTY",
    "DOUBLE_CLAIM",
    "DUPLICATE_DOCUMENT",
    "IDENTITY_CONFLICT",
    "RIGHTS_CONFLICT",
    "EXTERNAL_REGISTRY_CONFLICT",
)

CONFLICT_SEVERITIES: tuple[str, ...] = (
    "CLEAR",
    "INFO",
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
)

CONFLICT_STATUSES: tuple[str, ...] = ("OPEN", "RESOLVED")

# Bible secao 7, ordem canonica. D-04: eixo independente de ProjectStatusEnum.
INTEGRITY_STATUSES: tuple[str, ...] = (
    "DECLARED",
    "IDENTITY_VERIFIED",
    "EVIDENCE_PENDING",
    "EVIDENCE_VERIFIED",
    "UNDER_REVIEW",
    "INDEPENDENTLY_VERIFIED",
    "VERIFIED",
    "ON_HOLD",
    "SUSPENDED",
    "REVOKED",
    "REJECTED",
)

# Bible secao 23.
RISK_CLASSES: tuple[str, ...] = ("LOW", "MODERATE", "HIGH", "VERY_HIGH", "CRITICAL")
RISK_CLASS_BOUNDS: tuple[tuple[int, str], ...] = (
    (20, "LOW"),
    (40, "MODERATE"),
    (60, "HIGH"),
    (80, "VERY_HIGH"),
    (100, "CRITICAL"),
)
RISK_CLASS_AUTO_HOLD = "CRITICAL"

# Bible secao 22, restrita aos sinais computaveis sem registro externo.
RISK_SIGNAL_CODES: tuple[str, ...] = (
    "OVERLAP_CRITICAL",
    "OVERLAP_HIGH",
    "OVERLAP_MEDIUM",
    "OVERLAP_LOW",
    "DOUBLE_CLAIM",
    "LAND_CLAIM_UNVERIFIED",
    "CLAIM_EVIDENCE_PENDING",
    "POSSESSION_WITHOUT_TITLE",
    # NOVO -- Phase 05 / D-20: anomalia satelital confirmada por decisao humana.
    # risk_signals.code e text sem CHECK (202608170002), entao nenhuma migration
    # e necessaria para este acrescimo.
    "SATELLITE_ANOMALY_CONFIRMED_CRITICAL",
    "SATELLITE_ANOMALY_CONFIRMED_HIGH",
)

# Allowlist de minimizacao (mesmo principio de PUBLIC_DOCUMENT_TYPES): apenas
# estes codigos aparecem no dossie publico, e apenas code/weight/reason —
# nunca o metadata, que carrega ids de projetos de terceiros.
PUBLIC_RISK_SIGNAL_CODES: frozenset[str] = frozenset(RISK_SIGNAL_CODES)

# D-16 / Bible secao 40: vocabulario publico obrigatorio.
PUBLIC_INTEGRITY_STATUSES: tuple[str, ...] = (
    "DECLARED",
    "VERIFIED",
    "UNDER_REVIEW",
    "ON_HOLD",
    "SUSPENDED",
    "REVOKED",
)

PUBLIC_INTEGRITY_STATUS_BY_INTERNAL: dict[str, str] = {
    "DECLARED": "DECLARED",
    "IDENTITY_VERIFIED": "UNDER_REVIEW",
    "EVIDENCE_PENDING": "UNDER_REVIEW",
    "EVIDENCE_VERIFIED": "UNDER_REVIEW",
    "UNDER_REVIEW": "UNDER_REVIEW",
    "INDEPENDENTLY_VERIFIED": "VERIFIED",
    "VERIFIED": "VERIFIED",
    "ON_HOLD": "ON_HOLD",
    "SUSPENDED": "SUSPENDED",
    "REVOKED": "REVOKED",
    "REJECTED": "REVOKED",
}
