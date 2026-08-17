from __future__ import annotations

# Primeiro arquivo de teste 100% sem banco do repo (Phase 04.2 / INTG-04).
# Sem cliente HTTP, sem event loop, sem fabrica de sessao de banco. Apenas
# chamadas diretas as funcoes puras do risk_engine com dataclasses em memoria.

from backend_app.core.config import Settings
from backend_app.modules.integrity.risk_engine import (
    ClaimSnapshot,
    ConflictSnapshot,
    ProjectEventSnapshot,
    RiskSignalDTO,
    compute_signals,
    integrity_status_for,
    risk_class_for_score,
    score_from_signals,
)


def _claim(
    type: str = "RIGHT_TO_OPERATE",
    status: str = "DECLARED",
    has_evidence: bool = False,
    has_verified_evidence: bool = False,
) -> ClaimSnapshot:
    return ClaimSnapshot(
        type=type, status=status, has_evidence=has_evidence, has_verified_evidence=has_verified_evidence
    )


def _conflict(
    type: str = "GEOSPATIAL_OVERLAP",
    severity: str = "CRITICAL",
    status: str = "OPEN",
    overlap_percentage: float = 80.0,
) -> ConflictSnapshot:
    return ConflictSnapshot(type=type, severity=severity, status=status, overlap_percentage=overlap_percentage)


def _event(
    status: str = "CONFIRMED",
    severity: str = "CRITICAL",
    type: str = "VEGETATION_LOSS",
    cleared: bool = False,
) -> ProjectEventSnapshot:
    return ProjectEventSnapshot(type=type, status=status, severity=severity, cleared=cleared)


def test_no_claims_no_conflicts_yields_no_signals_score_zero_class_low() -> None:
    signals = compute_signals([], [])
    assert signals == []
    score = score_from_signals(signals)
    assert score == 0
    assert risk_class_for_score(score) == "LOW"


def test_unverified_possession_claim_yields_three_signals_score_forty_moderate() -> None:
    claims = [_claim(type="LAND_POSSESSION", status="DECLARED", has_evidence=False, has_verified_evidence=False)]
    signals = compute_signals(claims, [])
    codes = {s.code for s in signals}
    assert codes == {"LAND_CLAIM_UNVERIFIED", "CLAIM_EVIDENCE_PENDING", "POSSESSION_WITHOUT_TITLE"}
    weights = {s.code: s.weight for s in signals}
    assert weights["LAND_CLAIM_UNVERIFIED"] == 20.0
    assert weights["CLAIM_EVIDENCE_PENDING"] == 10.0
    assert weights["POSSESSION_WITHOUT_TITLE"] == 10.0
    score = score_from_signals(signals)
    assert score == 40
    assert risk_class_for_score(score) == "MODERATE"


def test_single_open_critical_overlap_conflict_yields_overlap_critical_signal() -> None:
    signals = compute_signals([], [_conflict(severity="CRITICAL")])
    assert len(signals) == 1
    assert signals[0].code == "OVERLAP_CRITICAL"
    assert signals[0].weight == 50.0


def test_two_open_critical_overlap_conflicts_yield_a_single_signal_with_count() -> None:
    conflicts = [_conflict(severity="CRITICAL"), _conflict(severity="CRITICAL")]
    signals = compute_signals([], conflicts)
    critical_signals = [s for s in signals if s.code == "OVERLAP_CRITICAL"]
    assert len(critical_signals) == 1
    assert critical_signals[0].weight == 50.0
    assert critical_signals[0].metadata["count"] == 2
    assert "2" in critical_signals[0].reason


def test_resolved_conflicts_are_ignored() -> None:
    signals = compute_signals([], [_conflict(severity="CRITICAL", status="RESOLVED")])
    assert signals == []


def test_double_claim_conflict_yields_double_claim_signal_weight_sixty() -> None:
    signals = compute_signals([], [_conflict(type="DOUBLE_CLAIM", severity="CRITICAL")])
    assert len(signals) == 1
    assert signals[0].code == "DOUBLE_CLAIM"
    assert signals[0].weight == 60.0


def test_score_saturates_at_one_hundred_never_above() -> None:
    conflicts = [
        _conflict(type="GEOSPATIAL_OVERLAP", severity="CRITICAL"),
        _conflict(type="DOUBLE_CLAIM", severity="CRITICAL"),
    ]
    claims = [
        _claim(type="LAND_POSSESSION", status="DECLARED", has_evidence=False, has_verified_evidence=False),
    ]
    signals = compute_signals(claims, conflicts)
    total_weight = sum(s.weight for s in signals)
    assert total_weight > 100
    score = score_from_signals(signals)
    assert score == 100


def test_risk_class_bounds() -> None:
    expected = {
        0: "LOW",
        20: "LOW",
        21: "MODERATE",
        40: "MODERATE",
        41: "HIGH",
        60: "HIGH",
        61: "VERY_HIGH",
        80: "VERY_HIGH",
        81: "CRITICAL",
        100: "CRITICAL",
    }
    for score, label in expected.items():
        assert risk_class_for_score(score) == label


def test_compute_signals_is_pure_and_deterministic() -> None:
    claims = [_claim(type="LAND_OWNERSHIP", status="EVIDENCE_PENDING", has_evidence=True)]
    conflicts = [_conflict(severity="HIGH")]
    first = compute_signals(claims, conflicts)
    second = compute_signals(claims, conflicts)
    assert first == second


def test_signal_reasons_are_non_empty_ptbr_and_start_with_weight() -> None:
    claims = [_claim(type="LAND_POSSESSION", status="DECLARED", has_evidence=False, has_verified_evidence=False)]
    conflicts = [_conflict(severity="CRITICAL"), _conflict(type="DOUBLE_CLAIM", severity="HIGH")]
    signals = compute_signals(claims, conflicts)
    assert signals
    for signal in signals:
        assert signal.reason
        assert signal.reason.startswith(f"+{signal.weight:.0f} ")


def test_signal_reasons_never_mention_other_projects() -> None:
    claims = [_claim(type="LAND_POSSESSION", status="DECLARED", has_evidence=False, has_verified_evidence=False)]
    conflicts = [
        _conflict(severity="CRITICAL"),
        _conflict(severity="HIGH"),
        _conflict(severity="MEDIUM"),
        _conflict(severity="LOW"),
        _conflict(type="DOUBLE_CLAIM", severity="CRITICAL"),
    ]
    signals = compute_signals(claims, conflicts)
    assert signals
    for signal in signals:
        assert "PRC-" not in signal.reason
        assert "projeto " not in signal.reason.lower()


def test_weights_come_from_settings_not_hardcoded() -> None:
    custom_settings = Settings(integrity_risk_weight_double_claim=99.0)
    signals = compute_signals([], [_conflict(type="DOUBLE_CLAIM", severity="CRITICAL")], settings=custom_settings)
    double_claim = [s for s in signals if s.code == "DOUBLE_CLAIM"]
    assert len(double_claim) == 1
    assert double_claim[0].weight == 99.0


def test_public_safe_flag_matches_public_signal_codes() -> None:
    signals = compute_signals([], [_conflict(severity="CRITICAL")])
    assert all(isinstance(s.public_safe, bool) for s in signals)
    assert signals[0].public_safe is True


def test_signals_sorted_by_weight_descending() -> None:
    claims = [_claim(type="LAND_POSSESSION", status="DECLARED", has_evidence=False, has_verified_evidence=False)]
    conflicts = [_conflict(severity="HIGH"), _conflict(type="DOUBLE_CLAIM", severity="HIGH")]
    signals = compute_signals(claims, conflicts)
    weights = [s.weight for s in signals]
    assert weights == sorted(weights, reverse=True)


def test_integrity_status_for_auto_hold_on_critical_class() -> None:
    claims = [_claim(status="DECLARED", has_evidence=False)]
    assert integrity_status_for(claims, risk_class="CRITICAL") == "ON_HOLD"


def test_integrity_status_for_evidence_verified_when_all_claims_verified() -> None:
    claims = [
        _claim(status="EVIDENCE_VERIFIED", has_evidence=True, has_verified_evidence=True),
        _claim(status="EVIDENCE_VERIFIED", has_evidence=True, has_verified_evidence=True),
    ]
    assert integrity_status_for(claims, risk_class="LOW") == "EVIDENCE_VERIFIED"


def test_integrity_status_for_evidence_pending_when_some_claim_has_evidence() -> None:
    claims = [
        _claim(status="EVIDENCE_PENDING", has_evidence=True),
        _claim(status="DECLARED", has_evidence=False),
    ]
    assert integrity_status_for(claims, risk_class="LOW") == "EVIDENCE_PENDING"


def test_integrity_status_for_declared_when_no_claims_or_no_evidence() -> None:
    assert integrity_status_for([], risk_class="LOW") == "DECLARED"
    claims = [_claim(status="DECLARED", has_evidence=False)]
    assert integrity_status_for(claims, risk_class="LOW") == "DECLARED"


def test_risk_signal_dto_is_a_plain_dataclass_without_db_types() -> None:
    signal = RiskSignalDTO(code="OVERLAP_CRITICAL", weight=50.0, reason="+50 teste", public_safe=True)
    assert signal.code == "OVERLAP_CRITICAL"
    assert signal.metadata == {}


# ---------------------------------------------------------------------------
# Phase 05 / D-20: sinal de anomalia satelital confirmada (Auto Hold existente)
# ---------------------------------------------------------------------------


def test_satellite_confirmed_critical_produces_signal() -> None:
    signals = compute_signals([], [], satellite_events=[_event(severity="CRITICAL")])
    matches = [s for s in signals if s.code == "SATELLITE_ANOMALY_CONFIRMED_CRITICAL"]
    assert len(matches) == 1
    assert matches[0].weight == 50.0


def test_satellite_two_confirmed_criticals_produce_one_signal_with_count() -> None:
    events = [_event(severity="CRITICAL"), _event(severity="CRITICAL")]
    signals = compute_signals([], [], satellite_events=events)
    matches = [s for s in signals if s.code == "SATELLITE_ANOMALY_CONFIRMED_CRITICAL"]
    assert len(matches) == 1
    assert matches[0].weight == 50.0
    assert matches[0].metadata["count"] == 2


def test_satellite_high_confirmed_produces_lower_weight_signal() -> None:
    signals = compute_signals([], [], satellite_events=[_event(severity="HIGH")])
    matches = [s for s in signals if s.code == "SATELLITE_ANOMALY_CONFIRMED_HIGH"]
    assert len(matches) == 1
    assert matches[0].weight == 30.0


def test_satellite_medium_confirmed_produces_no_signal() -> None:
    signals = compute_signals([], [], satellite_events=[_event(severity="MEDIUM")])
    assert not [s for s in signals if s.code.startswith("SATELLITE_ANOMALY_CONFIRMED")]

    signals_low = compute_signals([], [], satellite_events=[_event(severity="LOW")])
    assert not [s for s in signals_low if s.code.startswith("SATELLITE_ANOMALY_CONFIRMED")]


def test_satellite_non_confirmed_events_are_ignored() -> None:
    events = [
        _event(status="DETECTED", severity="CRITICAL"),
        _event(status="ANALYZED", severity="CRITICAL"),
        _event(status="DISMISSED", severity="CRITICAL"),
    ]
    signals = compute_signals([], [], satellite_events=events)
    assert not [s for s in signals if s.code.startswith("SATELLITE_ANOMALY_CONFIRMED")]


def test_satellite_cleared_event_stops_counting() -> None:
    signals = compute_signals([], [], satellite_events=[_event(severity="CRITICAL", cleared=True)])
    assert not [s for s in signals if s.code.startswith("SATELLITE_ANOMALY_CONFIRMED")]


def test_satellite_confirmed_critical_can_reach_auto_hold() -> None:
    signals = compute_signals(
        [],
        [_conflict(type="DOUBLE_CLAIM", severity="CRITICAL")],
        satellite_events=[_event(severity="CRITICAL")],
    )
    score = score_from_signals(signals)
    assert score == 100
    assert risk_class_for_score(score) == "CRITICAL"
    assert integrity_status_for([], risk_class="CRITICAL") == "ON_HOLD"


def test_satellite_signal_weight_comes_from_settings_not_hardcoded() -> None:
    custom_settings = Settings(integrity_risk_weight_satellite_anomaly_critical=99.0)
    signals = compute_signals([], [], satellite_events=[_event(severity="CRITICAL")], settings=custom_settings)
    matches = [s for s in signals if s.code == "SATELLITE_ANOMALY_CONFIRMED_CRITICAL"]
    assert len(matches) == 1
    assert matches[0].weight == 99.0


def test_satellite_signal_reasons_never_mention_other_projects() -> None:
    events = [_event(severity="CRITICAL"), _event(severity="HIGH")]
    signals = compute_signals([], [], satellite_events=events)
    satellite_signals = [s for s in signals if s.code.startswith("SATELLITE_ANOMALY_CONFIRMED")]
    assert satellite_signals
    for signal in satellite_signals:
        assert "PRC-" not in signal.reason
        assert "projeto " not in signal.reason.lower()


def test_compute_signals_backwards_compatible_without_satellite_events() -> None:
    claims = [_claim(type="LAND_POSSESSION", status="DECLARED", has_evidence=False, has_verified_evidence=False)]
    conflicts = [_conflict(severity="HIGH"), _conflict(type="DOUBLE_CLAIM", severity="HIGH")]
    with_two_args = compute_signals(claims, conflicts)
    with_empty_satellite = compute_signals(claims, conflicts, satellite_events=[])
    assert with_two_args == with_empty_satellite
