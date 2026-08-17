from __future__ import annotations

# Sinarca Satellite Monitoring -- Anomaly Detector (Phase 05 / SATM-06, D-17).
#
# Modulo PURO: proibido importar o driver assincrono de banco ou qualquer
# modelo do ORM. Entradas sao dataclasses simples; a leitura/escrita de
# SatelliteObservation/SatelliteAnomaly fica inteiramente no
# SatelliteService (Plan 05/06). Isso torna detect_anomaly testavel sem banco
# (tests/modules/satellite/test_anomaly_detector.py) e garante determinismo:
# mesma entrada -> mesma saida, sem estado acumulado.
#
# REGRA DE ACEITE NAO-DISCRICIONARIA (D-17/SATM-06): este modulo NUNCA produz
# o rotulo "DEFORESTATION". Classificacao juridica de desmatamento esta
# explicitamente fora de escopo (Bible). O vocabulario e fechado em
# PROJECT_EVENT_TYPES e ha um assert final que o comprova.

from dataclasses import dataclass, field
from datetime import datetime
from typing import Sequence

from backend_app.core.config import Settings, get_settings
from backend_app.modules.satellite.constants import (
    FORBIDDEN_AUTOMATIC_EVENT_TYPES,
    NDVI_DROP_SEVERITY_BOUNDS,
    PROJECT_EVENT_TYPES,
)


@dataclass(frozen=True)
class ObservationSnapshot:
    observed_at: datetime
    ndvi_mean: float | None = None
    ndmi_mean: float | None = None
    nbr_mean: float | None = None
    cloud_coverage: float | None = None
    valid_pixel_percentage: float | None = None


@dataclass(frozen=True)
class AnomalySignal:
    index_name: str        # SATELLITE_INDEX_NAMES
    event_type: str        # PROJECT_EVENT_TYPES
    severity: str          # PROJECT_EVENT_SEVERITIES
    value_before: float
    value_after: float
    drop_ratio: float      # positivo = queda; negativo = recuperacao
    confidence: float      # 0-100
    reason: str            # PT-BR, explicavel, sem citar projeto de terceiro
    metadata: dict = field(default_factory=dict)


def severity_for_drop_ratio(drop_ratio: float) -> str:
    """Primeiro rotulo de NDVI_DROP_SEVERITY_BOUNDS cujo limite seja >= drop_ratio.

    Acima do ultimo limite devolve "CRITICAL". Mesma tecnica de
    risk_class_for_score (backend_app/modules/integrity/risk_engine.py).
    """
    for upper_bound, label in NDVI_DROP_SEVERITY_BOUNDS:
        if drop_ratio <= upper_bound:
            return label
    return NDVI_DROP_SEVERITY_BOUNDS[-1][1]


def confidence_for(observation: ObservationSnapshot) -> float:
    # Confianca = quanto da cena e realmente utilizavel. Prioriza
    # valid_pixel_percentage (vem da Statistical API); na ausencia dele usa o
    # complemento da cobertura de nuvem. Sem nenhum dos dois, 50.0 (neutro).
    if observation.valid_pixel_percentage is not None:
        raw = observation.valid_pixel_percentage
    elif observation.cloud_coverage is not None:
        raw = 100.0 - observation.cloud_coverage
    else:
        raw = 50.0
    return max(0.0, min(100.0, round(raw, 2)))


def detect_anomaly(
    previous: ObservationSnapshot | None,
    current: ObservationSnapshot,
    settings: Settings | None = None,
) -> AnomalySignal | None:
    config = settings or get_settings()

    if previous is None:
        return None

    # Guarda defensiva de D-13: a observacao nem deveria ter sido persistida
    # com nuvem acima do limite, mas o detector nao confia cegamente em quem
    # a chama.
    if current.cloud_coverage is not None and current.cloud_coverage > config.satellite_max_cloud_coverage_pct:
        return None

    if previous.ndvi_mean is None or current.ndvi_mean is None or previous.ndvi_mean <= 0:
        return None

    ndvi_drop = (previous.ndvi_mean - current.ndvi_mean) / previous.ndvi_mean

    nbr_drop: float | None = None
    if previous.nbr_mean is not None and current.nbr_mean is not None and previous.nbr_mean > 0:
        nbr_drop = (previous.nbr_mean - current.nbr_mean) / previous.nbr_mean

    confidence = confidence_for(current)
    before_after_range = f"{previous.observed_at.date().isoformat()} e {current.observed_at.date().isoformat()}"

    if ndvi_drop >= config.satellite_ndvi_drop_threshold and nbr_drop is not None and nbr_drop >= config.satellite_nbr_fire_threshold:
        signal = AnomalySignal(
            index_name="NBR",
            event_type="POSSIBLE_FIRE",
            severity=severity_for_drop_ratio(ndvi_drop),
            value_before=previous.nbr_mean,  # type: ignore[arg-type]
            value_after=current.nbr_mean,  # type: ignore[arg-type]
            drop_ratio=ndvi_drop,
            confidence=confidence,
            reason=(
                f"Queda de {ndvi_drop * 100:.1f}% no NDVI e de {nbr_drop * 100:.1f}% "
                "no NBR — assinatura compatível com fogo"
            ),
            metadata={"ndvi_drop_ratio": ndvi_drop, "nbr_drop_ratio": nbr_drop},
        )
    elif ndvi_drop >= config.satellite_ndvi_drop_threshold:
        signal = AnomalySignal(
            index_name="NDVI",
            event_type="VEGETATION_LOSS",
            severity=severity_for_drop_ratio(ndvi_drop),
            value_before=previous.ndvi_mean,
            value_after=current.ndvi_mean,
            drop_ratio=ndvi_drop,
            confidence=confidence,
            reason=f"Queda de {ndvi_drop * 100:.1f}% no NDVI médio entre {before_after_range}",
            metadata={"ndvi_drop_ratio": ndvi_drop},
        )
    elif -ndvi_drop >= config.satellite_ndvi_recovery_threshold:
        signal = AnomalySignal(
            index_name="NDVI",
            event_type="VEGETATION_RECOVERY",
            severity="LOW",  # recuperacao nunca e incidente
            value_before=previous.ndvi_mean,
            value_after=current.ndvi_mean,
            drop_ratio=ndvi_drop,
            confidence=confidence,
            reason=f"Recuperação de {-ndvi_drop * 100:.1f}% no NDVI médio entre {before_after_range}",
            metadata={"ndvi_drop_ratio": ndvi_drop},
        )
    else:
        return None

    # Guardas nao-discricionarias em tempo de execucao (SATM-06): travam o
    # vocabulario fechado mesmo se um bug futuro tentar contornar o teste.
    assert signal.event_type in PROJECT_EVENT_TYPES
    assert signal.event_type not in FORBIDDEN_AUTOMATIC_EVENT_TYPES

    return signal


def detect_anomalies(
    observations: Sequence[ObservationSnapshot],
    settings: Settings | None = None,
) -> list[tuple[int, AnomalySignal]]:
    """Varre a serie (ja ordenada por observed_at) e devolve os sinais de cada par consecutivo.

    Para cada indice i >= 1, compara observations[i-1] (previous) com
    observations[i] (current). Devolve (i, sinal) apenas para pares que
    geraram anomalia. Puro: nao ordena, nao consulta banco, nao acumula
    estado entre chamadas -- quem chama e responsavel por entregar a serie
    ja ordenada por observed_at (Plan 06).
    """
    results: list[tuple[int, AnomalySignal]] = []
    for idx in range(1, len(observations)):
        signal = detect_anomaly(observations[idx - 1], observations[idx], settings=settings)
        if signal is not None:
            results.append((idx, signal))
    return results
