from __future__ import annotations

# Teste 100% sem banco (mesmo estilo de tests/test_risk_engine.py). Sem
# cliente HTTP, sem event loop, sem fabrica de sessao de banco -- apenas
# chamadas diretas as funcoes puras do anomaly_detector com dataclasses em
# memoria.

from datetime import datetime, timezone

from backend_app.core.config import Settings
from backend_app.modules.satellite.anomaly_detector import (
    AnomalySignal,
    ObservationSnapshot,
    confidence_for,
    detect_anomalies,
    detect_anomaly,
    severity_for_drop_ratio,
)
from backend_app.modules.satellite.constants import PROJECT_EVENT_TYPES


def _obs(
    ndvi: float | None = 0.80,
    *,
    day: int = 1,
    month: int = 1,
    nbr: float | None = None,
    ndmi: float | None = None,
    cloud: float | None = 5.0,
    valid: float | None = None,
) -> ObservationSnapshot:
    return ObservationSnapshot(
        observed_at=datetime(2024, month, day, tzinfo=timezone.utc),
        ndvi_mean=ndvi,
        ndmi_mean=ndmi,
        nbr_mean=nbr,
        cloud_coverage=cloud,
        valid_pixel_percentage=valid,
    )


def test_no_previous_observation_yields_none() -> None:
    assert detect_anomaly(None, _obs()) is None


def test_stable_ndvi_yields_none() -> None:
    previous = _obs(0.80, day=1)
    current = _obs(0.78, day=31)  # queda relativa < 0.15, abaixo do default
    assert detect_anomaly(previous, current) is None


def test_ndvi_drop_of_thirty_percent_yields_vegetation_loss_medium() -> None:
    previous = _obs(1.0, day=1)
    current = _obs(0.70, day=31)
    signal = detect_anomaly(previous, current)
    assert signal is not None
    assert signal.event_type == "VEGETATION_LOSS"
    assert signal.severity == "MEDIUM"
    assert signal.index_name == "NDVI"
    assert abs(signal.drop_ratio - 0.30) < 1e-9


def test_severity_boundaries_for_drop_ratio() -> None:
    assert severity_for_drop_ratio(0.20) == "LOW"
    assert severity_for_drop_ratio(0.30) == "MEDIUM"
    assert severity_for_drop_ratio(0.40) == "HIGH"
    assert severity_for_drop_ratio(0.70) == "CRITICAL"


def test_nbr_drop_with_ndvi_drop_yields_possible_fire_with_precedence() -> None:
    previous = _obs(1.0, day=1, nbr=1.0)
    current = _obs(0.70, day=31, nbr=0.60)  # ndvi drop 0.30, nbr drop 0.40
    signal = detect_anomaly(previous, current)
    assert signal is not None
    assert signal.event_type == "POSSIBLE_FIRE"
    assert signal.index_name == "NBR"


def test_isolated_nbr_drop_without_ndvi_drop_yields_none() -> None:
    previous = _obs(0.80, day=1, nbr=1.0)
    current = _obs(0.79, day=31, nbr=0.50)  # ndvi estavel, nbr caiu forte
    assert detect_anomaly(previous, current) is None


def test_ndvi_rise_above_recovery_threshold_yields_vegetation_recovery_low() -> None:
    previous = _obs(0.50, day=1)
    current = _obs(0.70, day=31)  # alta relativa de 0.40
    signal = detect_anomaly(previous, current)
    assert signal is not None
    assert signal.event_type == "VEGETATION_RECOVERY"
    assert signal.severity == "LOW"
    assert signal.drop_ratio < 0


def test_high_cloud_observation_never_produces_anomaly() -> None:
    previous = _obs(1.0, day=1)
    current = _obs(0.50, day=31, cloud=95.0)  # queda grande, mas nuvem acima do limite
    assert detect_anomaly(previous, current) is None


def test_missing_ndvi_is_not_treated_as_zero() -> None:
    previous = _obs(None, day=1)
    current = _obs(0.50, day=31)
    assert detect_anomaly(previous, current) is None

    previous2 = _obs(0.80, day=1)
    current2 = _obs(None, day=31)
    assert detect_anomaly(previous2, current2) is None


def test_previous_ndvi_zero_yields_none_division_by_zero_impossible() -> None:
    previous = _obs(0.0, day=1)
    current = _obs(0.50, day=31)
    assert detect_anomaly(previous, current) is None


def test_detect_anomaly_is_pure_and_deterministic() -> None:
    previous = _obs(1.0, day=1)
    current = _obs(0.70, day=31)
    first = detect_anomaly(previous, current)
    second = detect_anomaly(previous, current)
    assert first == second


def test_ndvi_drop_threshold_comes_from_settings_not_hardcoded() -> None:
    previous = _obs(1.0, day=1)
    current = _obs(0.70, day=31)  # queda de 0.30
    custom_settings = Settings(satellite_ndvi_drop_threshold=0.90)
    assert detect_anomaly(previous, current, settings=custom_settings) is None


def test_satellite_anomaly_weight_signal_confidence_between_zero_and_hundred_and_falls_with_cloud() -> None:
    previous = _obs(1.0, day=1)
    low_cloud = detect_anomaly(previous, _obs(0.70, day=31, cloud=0.0))
    high_cloud = detect_anomaly(previous, _obs(0.70, day=31, cloud=15.0))
    assert low_cloud is not None and high_cloud is not None
    assert 0.0 <= high_cloud.confidence <= 100.0
    assert 0.0 <= low_cloud.confidence <= 100.0
    assert high_cloud.confidence < low_cloud.confidence


def test_confidence_for_prefers_valid_pixel_percentage_over_cloud_coverage() -> None:
    observation = _obs(0.80, valid=92.5, cloud=50.0)
    assert confidence_for(observation) == 92.5


def test_confidence_for_falls_back_to_cloud_complement() -> None:
    observation = _obs(0.80, cloud=30.0, valid=None)
    assert confidence_for(observation) == 70.0


def test_confidence_for_neutral_without_any_quality_signal() -> None:
    observation = _obs(0.80, cloud=None, valid=None)
    assert confidence_for(observation) == 50.0


def test_anomaly_never_labels_deforestation_directly() -> None:
    previous = _obs(1.0, day=1)
    for drop_pct in range(16, 96, 4):
        current = _obs(1.0 - drop_pct / 100.0, day=2)
        signal = detect_anomaly(previous, current)
        if signal is not None:
            assert signal.event_type in PROJECT_EVENT_TYPES
            assert signal.event_type != "DEFORESTATION"


def test_detect_anomalies_scans_consecutive_pairs_and_returns_indices() -> None:
    observations = [
        _obs(1.0, day=1, month=1),
        _obs(0.70, day=31, month=1),  # anomalia com o dia 1 (indice 1)
        _obs(0.68, day=1, month=3),  # sem anomalia com o dia 31 (queda estavel)
    ]
    results = detect_anomalies(observations)
    assert len(results) == 1
    idx, signal = results[0]
    assert idx == 1
    assert signal.event_type == "VEGETATION_LOSS"


def test_detect_anomalies_empty_series_yields_empty_list() -> None:
    assert detect_anomalies([]) == []
    assert detect_anomalies([_obs()]) == []


def test_anomaly_signal_is_a_plain_dataclass_without_db_types() -> None:
    signal = AnomalySignal(
        index_name="NDVI",
        event_type="VEGETATION_LOSS",
        severity="MEDIUM",
        value_before=1.0,
        value_after=0.7,
        drop_ratio=0.30,
        confidence=80.0,
        reason="teste",
    )
    assert signal.event_type == "VEGETATION_LOSS"
    assert signal.metadata == {}
