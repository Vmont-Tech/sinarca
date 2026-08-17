from __future__ import annotations

# Phase 05 / D-19 -- SatelliteEvidenceService: evidencia visual before/after
# de uma anomalia analisada.
#
# A Process API custa MUITO mais Processing Units que a Statistical API,
# entao before.png/after.png sao gerados APENAS quando um ProjectEvent chega
# a ANALYZED -- nunca por observacao de rotina. Cada imagem e hasheada em
# SHA-256 e persistida com o mesmo pipeline de documents.sha256_hash
# (Phase 3/04.2): hash -> StorageLocation -> gravacao no Supabase Storage.

import hashlib
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from backend_app.adapters.satellite import SatelliteProvider
from backend_app.core.config import Settings, get_settings
from backend_app.db.models import (
    Project,
    ProjectEvent,
    SatelliteAnomaly,
    SatelliteEvidence,
    SatelliteObservation,
)
from backend_app.db.repositories import create_audit_event
from backend_app.modules import supabase_storage as storage_client
from backend_app.modules.storage_paths import satellite_evidence_location

BEFORE_IMAGE = "BEFORE_IMAGE"
AFTER_IMAGE = "AFTER_IMAGE"
_EVIDENCE_WINDOW = timedelta(days=15)


class SatelliteEvidenceService:
    """Evidencia visual de anomalia (D-19).

    A Process API custa MUITO mais Processing Units que a Statistical API,
    entao before.png/after.png sao gerados APENAS quando um ProjectEvent
    chega a ANALYZED -- nunca por observacao de rotina. Cada imagem e
    hasheada em SHA-256 e persistida com o mesmo pipeline de
    documents.sha256_hash (Phase 3/04.2).
    """

    def __init__(
        self, session: AsyncSession, provider: SatelliteProvider, settings: Settings | None = None
    ) -> None:
        self.session = session
        self.provider = provider
        self.settings = settings or get_settings()

    async def capture_before_after(self, project: Project, event: ProjectEvent) -> list[SatelliteEvidence]:
        # D-19: gate de custo. Qualquer outro estado retorna sem gastar PU.
        if event.status != "ANALYZED":
            return []

        existing = (
            await self.session.execute(
                select(SatelliteEvidence).where(SatelliteEvidence.project_event_id == event.id)
            )
        ).scalars().all()
        existing_kinds = {item.kind for item in existing}
        if {BEFORE_IMAGE, AFTER_IMAGE}.issubset(existing_kinds):
            # Idempotencia: ja capturado, nunca chama o provider de novo.
            return list(existing)

        if event.anomaly_id is None:
            return []
        anomaly = await self.session.get(SatelliteAnomaly, event.anomaly_id)
        if anomaly is None or anomaly.observation_id is None or anomaly.previous_observation_id is None:
            return []

        current_observation = await self.session.get(SatelliteObservation, anomaly.observation_id)
        previous_observation = await self.session.get(SatelliteObservation, anomaly.previous_observation_id)
        if current_observation is None or previous_observation is None:
            return []

        from backend_app.modules.projects.service import ProjectsService

        boundary = await ProjectsService(self.session).boundary_item(str(project.id))
        aoi = (boundary or {}).get("active")
        if aoi is None:
            raise RuntimeError("Projeto sem active_boundary: evidencia visual não pode definir a AOI")

        windows = [
            (BEFORE_IMAGE, previous_observation.observed_at - _EVIDENCE_WINDOW, previous_observation.observed_at + _EVIDENCE_WINDOW),
            (AFTER_IMAGE, current_observation.observed_at - _EVIDENCE_WINDOW, current_observation.observed_at + _EVIDENCE_WINDOW),
        ]

        captured: list[SatelliteEvidence] = []
        # Nunca em paralelo (D-11): uma janela por vez, na ordem before -> after.
        for kind, date_from, date_to in windows:
            if kind in existing_kinds:
                continue

            image = await self.provider.get_image(
                aoi=aoi,
                date_from=date_from,
                date_to=date_to,
                max_cloud_coverage=self.settings.satellite_max_cloud_coverage_pct,
                width=512,
                height=512,
            )
            sha256 = hashlib.sha256(image.content).hexdigest()
            location = satellite_evidence_location(project.friendly_id, kind, sha256, ".png")
            await storage_client.upload_storage_object(
                location.bucket, location.object_path, image.content, image.mime_type
            )

            stmt = (
                pg_insert(SatelliteEvidence.__table__)
                .values(
                    project_id=project.id,
                    project_event_id=event.id,
                    anomaly_id=event.anomaly_id,
                    kind=kind,
                    storage_bucket=location.bucket,
                    storage_object_path=location.object_path,
                    storage_path=location.uri,
                    sha256_hash=sha256,
                    mime_type=image.mime_type,
                    size_bytes=len(image.content),
                    captured_at=datetime.now(timezone.utc),
                    metadata={
                        "width": image.width,
                        "height": image.height,
                        "window_from": date_from.isoformat(),
                        "window_to": date_to.isoformat(),
                    },
                )
                # satellite_evidence_event_kind_idx (migration 202608180001) e
                # um indice PARCIAL (where project_event_id is not null) -- o
                # Postgres so infere o indice do ON CONFLICT se o predicado for
                # repetido aqui.
                .on_conflict_do_nothing(
                    index_elements=["project_event_id", "kind"],
                    index_where=SatelliteEvidence.__table__.c.project_event_id.isnot(None),
                )
                .returning(SatelliteEvidence.__table__.c.id)
            )
            result = await self.session.execute(stmt)
            inserted_row = result.first()
            await self.session.flush()
            if inserted_row is not None:
                captured.append(await self.session.get(SatelliteEvidence, inserted_row.id))

        if not captured:
            return list(existing)

        await create_audit_event(
            self.session,
            action="SATELLITE_EVIDENCE_CAPTURED",
            entity_type="projects",
            entity_id=project.id,
            metadata={
                "event_id": str(event.id),
                "kinds": [item.kind for item in captured],
                "sha256": {item.kind: item.sha256_hash for item in captured},
            },
        )
        await self.session.flush()
        return [*existing, *captured]

    async def list_evidence(self, event_id) -> list[SatelliteEvidence]:
        return (
            await self.session.execute(
                select(SatelliteEvidence).where(SatelliteEvidence.project_event_id == event_id)
            )
        ).scalars().all()

    async def load_evidence_bytes(self, evidence: SatelliteEvidence) -> bytes | None:
        # Este servico nao engole erro: quem decide que "sem imagem o evento
        # continua valido" e o monitoring, nao a camada de evidencia.
        if not evidence.storage_bucket or not evidence.storage_object_path:
            return None
        return await storage_client.download_storage_object(evidence.storage_bucket, evidence.storage_object_path)
