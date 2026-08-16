from __future__ import annotations

# Sinarca Integrity Layer -- Risk Engine (Phase 04.2 / INTG-04, Bible secoes 21-23/42).
#
# Modulo PURO: proibido importar o driver assincrono de banco ou qualquer
# modelo do ORM. Entradas sao dataclasses simples; a leitura do banco
# (Claim/Evidence/Conflict) fica inteiramente no IntegrityService (service.py).
# Isso torna compute_signals/score_from_signals/risk_class_for_score testaveis
# sem banco (tests/test_risk_engine.py) e garante que o recalculo seja sempre
# idempotente: mesma entrada -> mesma saida, sem estado acumulado (D-13/D-19,
# RESEARCH Pitfall 5).

from dataclasses import dataclass, field
from typing import Sequence

from backend_app.core.config import Settings, get_settings
from backend_app.modules.integrity.constants import (
    PUBLIC_RISK_SIGNAL_CODES,
    RISK_CLASS_AUTO_HOLD,
    RISK_CLASS_BOUNDS,
    RISK_SIGNAL_CODES,
)

_SIGNAL_ORDER: dict[str, int] = {code: idx for idx, code in enumerate(RISK_SIGNAL_CODES)}

_LAND_CLAIM_TYPES: frozenset[str] = frozenset({"LAND_OWNERSHIP", "LAND_POSSESSION"})
_CLAIM_EVIDENCE_PENDING_STATUSES: frozenset[str] = frozenset({"DECLARED", "EVIDENCE_PENDING"})


@dataclass(frozen=True)
class ClaimSnapshot:
    type: str
    status: str
    has_evidence: bool
    has_verified_evidence: bool


@dataclass(frozen=True)
class ConflictSnapshot:
    type: str
    severity: str
    status: str
    overlap_percentage: float


@dataclass(frozen=True)
class RiskSignalDTO:
    code: str
    weight: float
    reason: str
    public_safe: bool
    metadata: dict = field(default_factory=dict)


def compute_signals(
    claims: Sequence[ClaimSnapshot],
    conflicts: Sequence[ConflictSnapshot],
    settings: Settings | None = None,
) -> list[RiskSignalDTO]:
    """Transforma o estado de Claim/Conflict em sinais explicaveis com peso.

    Cada bucket emite NO MAXIMO um sinal -- a contagem entra no reason/metadata,
    nunca multiplica o peso (evita inflacao acumulativa). Conflicts considerados
    sao apenas os OPEN; RESOLVED sao ignorados. Ordena por peso decrescente e,
    em empate, pela ordem canonica de RISK_SIGNAL_CODES.
    """
    config = settings or get_settings()
    open_conflicts = [c for c in conflicts if c.status == "OPEN"]

    signals: list[RiskSignalDTO] = []

    overlap_specs = (
        ("CRITICAL", "OVERLAP_CRITICAL", config.integrity_risk_weight_overlap_critical, "acima de 50%"),
        ("HIGH", "OVERLAP_HIGH", config.integrity_risk_weight_overlap_high, "entre 20% e 50%"),
        ("MEDIUM", "OVERLAP_MEDIUM", config.integrity_risk_weight_overlap_medium, "entre 5% e 20%"),
    )
    for severity, code, weight, faixa in overlap_specs:
        matches = [
            c for c in open_conflicts if c.type == "GEOSPATIAL_OVERLAP" and c.severity == severity
        ]
        if matches:
            n = len(matches)
            signals.append(
                RiskSignalDTO(
                    code=code,
                    weight=float(weight),
                    reason=(
                        f"+{weight:.0f} {n} sobreposicao(oes) geoespacial(is) {faixa} da area do projeto"
                    ),
                    public_safe=code in PUBLIC_RISK_SIGNAL_CODES,
                    metadata={"count": n},
                )
            )

    low_matches = [
        c
        for c in open_conflicts
        if c.type == "GEOSPATIAL_OVERLAP" and c.severity in ("LOW", "INFO")
    ]
    if low_matches:
        n = len(low_matches)
        weight = config.integrity_risk_weight_overlap_low
        signals.append(
            RiskSignalDTO(
                code="OVERLAP_LOW",
                weight=float(weight),
                reason=f"+{weight:.0f} {n} sobreposicao(oes) geoespacial(is) abaixo de 5% da area do projeto",
                public_safe="OVERLAP_LOW" in PUBLIC_RISK_SIGNAL_CODES,
                metadata={"count": n},
            )
        )

    double_claim_matches = [c for c in open_conflicts if c.type == "DOUBLE_CLAIM"]
    if double_claim_matches:
        n = len(double_claim_matches)
        weight = config.integrity_risk_weight_double_claim
        signals.append(
            RiskSignalDTO(
                code="DOUBLE_CLAIM",
                weight=float(weight),
                reason=(
                    f"+{weight:.0f} Mesmo atributo ambiental reivindicado por {n} outro(s) "
                    "projeto(s) na area sobreposta"
                ),
                public_safe="DOUBLE_CLAIM" in PUBLIC_RISK_SIGNAL_CODES,
                metadata={"count": n},
            )
        )

    land_claims_unverified = [
        c for c in claims if c.type in _LAND_CLAIM_TYPES and not c.has_verified_evidence
    ]
    if land_claims_unverified:
        weight = config.integrity_risk_weight_land_claim_unverified
        possession_word = (
            "posse" if any(c.type == "LAND_POSSESSION" for c in land_claims_unverified) else "propriedade"
        )
        signals.append(
            RiskSignalDTO(
                code="LAND_CLAIM_UNVERIFIED",
                weight=float(weight),
                reason=f"+{weight:.0f} Declaracao de {possession_word} da terra sem evidencia validada",
                public_safe="LAND_CLAIM_UNVERIFIED" in PUBLIC_RISK_SIGNAL_CODES,
                metadata={"count": len(land_claims_unverified)},
            )
        )

    claims_evidence_pending = [c for c in claims if c.status in _CLAIM_EVIDENCE_PENDING_STATUSES]
    if claims_evidence_pending:
        n = len(claims_evidence_pending)
        weight = config.integrity_risk_weight_claim_evidence_pending
        signals.append(
            RiskSignalDTO(
                code="CLAIM_EVIDENCE_PENDING",
                weight=float(weight),
                reason=f"+{weight:.0f} {n} declaracao(oes) ainda sem dossie documental completo",
                public_safe="CLAIM_EVIDENCE_PENDING" in PUBLIC_RISK_SIGNAL_CODES,
                metadata={"count": n},
            )
        )

    possession_claims = [c for c in claims if c.type == "LAND_POSSESSION"]
    if possession_claims:
        weight = config.integrity_risk_weight_possession_without_title
        signals.append(
            RiskSignalDTO(
                code="POSSESSION_WITHOUT_TITLE",
                weight=float(weight),
                reason=f"+{weight:.0f} Posse declarada sem documento legal de propriedade",
                public_safe="POSSESSION_WITHOUT_TITLE" in PUBLIC_RISK_SIGNAL_CODES,
                metadata={"count": len(possession_claims)},
            )
        )

    signals.sort(key=lambda s: (-s.weight, _SIGNAL_ORDER.get(s.code, len(_SIGNAL_ORDER))))
    return signals


def score_from_signals(signals: Sequence[RiskSignalDTO]) -> int:
    """Soma os pesos e satura em [0, 100] (nunca 110 -- Bible secao 23)."""
    total = sum(s.weight for s in signals)
    return max(0, min(100, int(round(total))))


def risk_class_for_score(score: int) -> str:
    """Primeiro label de RISK_CLASS_BOUNDS cujo limite superior seja >= score."""
    for upper_bound, label in RISK_CLASS_BOUNDS:
        if score <= upper_bound:
            return label
    return RISK_CLASS_BOUNDS[-1][1]


def integrity_status_for(claims: Sequence[ClaimSnapshot], *, risk_class: str) -> str:
    """D-06 + Bible secao 7: integrity_status nao-discricionario nesta fase.

    IMPORTANTE: VERIFIED, IDENTITY_VERIFIED e INDEPENDENTLY_VERIFIED NUNCA sao
    atribuidos nesta fase -- dependem de verificacao de identidade e auditoria
    independente, disponiveis apenas na Phase 05.1. SUSPENDED/REVOKED/REJECTED
    tambem nao sao automaticos nesta fase (dependem de decisao humana/gate
    externo fora do escopo do Risk Engine).
    """
    if risk_class == RISK_CLASS_AUTO_HOLD:
        return "ON_HOLD"
    if claims and all(c.status == "EVIDENCE_VERIFIED" for c in claims):
        return "EVIDENCE_VERIFIED"
    if any(c.has_evidence for c in claims):
        return "EVIDENCE_PENDING"
    return "DECLARED"
