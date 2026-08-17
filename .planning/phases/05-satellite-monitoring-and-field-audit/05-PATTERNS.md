# Phase 05: satellite-monitoring-and-field-audit - Pattern Map

**Mapped:** 2026-08-16
**Files analyzed:** 31 (new + modified)
**Analogs found:** 27 / 31 (4 have no direct analog — first-of-kind infrastructure, documented below)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend_app/adapters/copernicus.py` (NEW) | service (adapter) | request-response (external HTTP) | `backend_app/adapters/stellar.py` | exact |
| `backend_app/modules/satellite/constants.py` (NEW) | config | — | `backend_app/modules/integrity/constants.py` | exact |
| `backend_app/modules/satellite/anomaly_detector.py` (NEW) | service (pure module) | transform | `backend_app/modules/integrity/risk_engine.py` | exact |
| `backend_app/modules/satellite/historical_reconstruction.py` (NEW) | service | batch | `backend_app/modules/integrity/service.py` (`recalculate_risk_score`) | role-match |
| `backend_app/modules/satellite/monitoring.py` (NEW) | service | event-driven / batch | `backend_app/modules/integrity/service.py` | role-match |
| `backend_app/modules/satellite/evidence.py` (NEW) | service | file-I/O | `backend_app/modules/projects/routes.py` (`upload_project_document` pipeline) | role-match |
| `backend_app/modules/satellite/scheduler.py` (NEW) | config (infra) | event-driven | none — first APScheduler infra in repo | no analog |
| `backend_app/modules/satellite/service.py` (NEW) | service | CRUD + orchestration | `backend_app/modules/integrity/service.py` | exact |
| `backend_app/modules/satellite/schemas.py` (NEW) | model (DTO) | — | `backend_app/modules/projects/schemas.py` (Pydantic response models) | role-match |
| `backend_app/modules/satellite/routes.py` (NEW) | route/controller | request-response | `backend_app/modules/audit/routes.py` + `backend_app/modules/projects/routes.py` | exact |
| `backend_app/modules/audit/routes.py` (MODIFIED) | route/controller | request-response, file-I/O | itself (evolve) + `upload_project_document` (routes.py:485-565) | exact |
| `backend_app/modules/integrity/risk_engine.py` (MODIFIED) | service (pure module) | transform | itself (`compute_signals`) | exact |
| `backend_app/modules/integrity/service.py` (MODIFIED) | service | CRUD | itself (`recalculate_risk_score`) | exact |
| `backend_app/modules/integrity/constants.py` (MODIFIED) | config | — | itself (`RISK_SIGNAL_CODES`) | exact |
| `backend_app/modules/projects/service.py` (MODIFIED) | service | CRUD | itself (`create_project`, `deterministic_baseline`) | exact |
| `backend_app/main.py` (MODIFIED) | config (lifespan) | event-driven (startup/shutdown) | none — first FastAPI lifespan in repo (pattern from FastAPI docs, cited in RESEARCH.md) | no analog |
| `backend_app/core/config.py` (MODIFIED) | config | — | itself (existing `integrity_*` settings block) | exact |
| `pyproject.toml` (MODIFIED) | config | — | itself (`[dependency-groups]`/`[project] dependencies`) | exact |
| `supabase/migrations/*_satellite_observations_anomalies_events.sql` (NEW) | migration | — | `supabase/migrations/202608170001_integrity_claims_evidence_conflicts.sql` | exact |
| `supabase/migrations/*_credit_adjustment_pendencies.sql` (NEW) | migration | — | `supabase/migrations/202608150001_certification_workbench.sql` (`certification_pendencies`) | exact |
| `supabase/migrations/*_copernicus_api_usage.sql` (NEW) | migration | — | `supabase/migrations/202608170001_...sql` (idempotent guard pattern) | exact |
| `tests/adapters/test_copernicus.py` (NEW) | test | request-response (mocked HTTP) | `tests/adapters/test_blockchain_financial_adapters.py` | exact |
| `tests/modules/satellite/test_anomaly_detector.py` (NEW) | test | transform (pure, no DB) | `tests/test_risk_engine.py` | exact |
| `tests/modules/satellite/test_monitoring_job.py` (NEW) | test | integration | `tests/test_api_integration.py` (partial) + `tests/test_risk_engine.py` (pure parts) | role-match |
| `tests/test_audit_field_evidence.py` (NEW) | test | integration (upload) | `tests/test_api_integration.py` | role-match |
| `tests/test_satellite_incident_recalc.py` (NEW) | test | integration | `tests/test_risk_engine.py` + `tests/test_api_integration.py` | role-match |
| `src/pages/Dashboard/MonitoringNDVI.tsx` (MODIFIED) | component (page) | request-response + streaming(map tiles) | itself (existing, fully simulated) + `src/components/ProjectGeofencePreview.tsx` (real Leaflet) | exact (self) / exact (map) |
| `src/pages/Dashboard/AuditorReview.tsx` (MODIFIED) | component (page) | file-I/O + request-response | itself (existing) + `src/services/projectDocuments.ts` (upload pattern) | exact |
| `src/pages/Dashboard/MrcaDetails.tsx` (MODIFIED) | component (page) | request-response | itself (existing "Baseline técnico" tile block) | exact |
| `src/services/satelliteMonitoring.ts` (NEW) | service (client) | request-response | `src/services/projectDocuments.ts` / `src/services/api.ts` | exact |
| `src/services/auditEvidence.ts` (NEW, optional split) | service (client) | file-I/O | `src/services/projectDocuments.ts` | exact |
| `src/services/fieldCapture.ts` (REUSED, no changes) | service (client) | event-driven (hardware capability) | — (already the analog for D-04, consumed as-is) | n/a |

---

## Pattern Assignments

### `backend_app/adapters/copernicus.py` (service/adapter, request-response)

**Analog:** `backend_app/adapters/stellar.py` (full file read, 169 lines)

**Fail-closed config pattern** (`stellar.py:13-49`):
```python
@dataclass(frozen=True)
class StellarAdapterConfig:
    mode: StellarMode = "local"
    network: str = "testnet"
    horizon_url: str | None = None
    soroban_rpc_url: str | None = None
    issuer_secret_key: str | None = None
    distributor_secret_key: str | None = None
    contract_id: str | None = None

    @classmethod
    def from_env(cls) -> "StellarAdapterConfig":
        mode = _mode_from_env()
        return cls(
            mode=mode,
            network=os.getenv("STELLAR_NETWORK", "testnet"),
            horizon_url=os.getenv("STELLAR_HORIZON_URL"),
            soroban_rpc_url=os.getenv("SOROBAN_RPC_URL") or os.getenv("STELLAR_SOROBAN_RPC_URL"),
            issuer_secret_key=os.getenv("STELLAR_ISSUER_SECRET_KEY"),
            distributor_secret_key=os.getenv("STELLAR_DISTRIBUTOR_SECRET_KEY"),
            contract_id=os.getenv("SOROBAN_CONTRACT_ID") or os.getenv("STELLAR_CONTRACT_ID"),
        )

    def assert_ready(self) -> None:
        if self.mode == "local":
            return
        missing: list[str] = []
        if not self.issuer_secret_key:
            missing.append("STELLAR_ISSUER_SECRET_KEY")
        if not self.distributor_secret_key:
            missing.append("STELLAR_DISTRIBUTOR_SECRET_KEY")
        if not self.horizon_url and not self.soroban_rpc_url:
            missing.append("STELLAR_HORIZON_URL or SOROBAN_RPC_URL")
        if missing:
            raise RuntimeError("Configuração Stellar incompleta")
```
`CopernicusAdapterConfig` copies this shape exactly but has **no `local` bypass mode** — RESEARCH.md Pattern 1 (D-07/D-08) makes `assert_ready()` unconditional (Copernicus has no "local/testnet/live" concept, only "configured or not"):
```python
# RESEARCH.md Pattern 1, to write verbatim into copernicus.py
@dataclass(frozen=True)
class CopernicusAdapterConfig:
    client_id: str | None = None
    client_secret: str | None = None
    base_url: str = "https://sh.dataspace.copernicus.eu"
    stac_url: str = "https://stac.dataspace.copernicus.eu/v1"
    token_url: str = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"

    @classmethod
    def from_env(cls) -> "CopernicusAdapterConfig":
        return cls(
            client_id=os.getenv("COPERNICUS_CLIENT_ID"),
            client_secret=os.getenv("COPERNICUS_CLIENT_SECRET"),
        )

    def assert_ready(self) -> None:
        missing = []
        if not self.client_id:
            missing.append("COPERNICUS_CLIENT_ID")
        if not self.client_secret:
            missing.append("COPERNICUS_CLIENT_SECRET")
        if missing:
            raise RuntimeError(f"Configuração Copernicus incompleta: {', '.join(missing)}")
```

**Operation-call pattern — every public method calls `assert_ready()` first** (`stellar.py:56-57`, `stellar.py:133-134`):
```python
def sponsor_account_and_trustline(self, project_id: str, producer_account: str, asset_code: str) -> dict[str, Any]:
    self.config.assert_ready()
    ...

def _operation(self, event_type: str, operation: str, payload: dict[str, Any]) -> dict[str, Any]:
    self.config.assert_ready()
    ...
```
Every `CopernicusProvider.search_scenes()`/`get_statistics()`/`get_image()` must open with `self.config.assert_ready()` before any `httpx` call — never construct a request first and fail on the network call.

**Async token cache + semaphore (new pattern, no sync precedent exists)** — RESEARCH.md Pattern 2, write verbatim as the skeleton:
```python
class CopernicusProvider:
    def __init__(self, config: CopernicusAdapterConfig | None = None) -> None:
        self.config = config or CopernicusAdapterConfig.from_env()
        self._client = httpx.AsyncClient(timeout=30.0)
        self._token: str | None = None
        self._token_expires_at: datetime | None = None
        self._token_lock = asyncio.Lock()
        self._concurrency = asyncio.Semaphore(2)  # D-11: 2 concurrent requests on free tier

    async def _get_token(self) -> str:
        self.config.assert_ready()
        async with self._token_lock:
            if self._token and self._token_expires_at and datetime.now(timezone.utc) < self._token_expires_at:
                return self._token
            resp = await self._client.post(
                self.config.token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.config.client_id,
                    "client_secret": self.config.client_secret,
                },
            )
            resp.raise_for_status()
            body = resp.json()
            self._token = body["access_token"]
            self._token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=body["expires_in"] - 30)
            return self._token
```
Every outbound call (`search_scenes`/`get_statistics`/`get_image`) must be wrapped `async with self._concurrency:` (D-11) around the actual `httpx` request, after `_get_token()`.

**Anti-pattern to avoid** (RESEARCH.md, confirmed no code in repo does this): never use `requests`/`urllib.request` synchronously inside this adapter — `etherfuse.py`/`polygon.py` do this deliberately (they aren't async), but `copernicus.py` is explicitly the first *async* adapter and must use `httpx.AsyncClient` end to end.

---

### `backend_app/modules/satellite/constants.py` (config)

**Analog:** `backend_app/modules/integrity/constants.py` (full file read, 145 lines)

**Vocabulary-as-tuple pattern, header comment mandatory** (`constants.py:1-8`):
```python
from __future__ import annotations

# Vocabulario canonico do Sinarca Integrity Layer (Phase 04.2).
# Estas tuplas sao a fonte unica de verdade: os check constraints das migrations
# 202608170001 e 202608170002 espelham exatamente estas listas.
# Convencao do repo desde a Phase 04: text + check no SQL, String em models.py.
# NUNCA criar tipo ENUM novo no Postgres para estes campos.
```
Copy this comment style verbatim (translated to the satellite domain) at the top of `satellite/constants.py`: state explicitly that these tuples are the single source of truth mirrored by the new migration's `check (... in (...))` clauses, and that `text + check` is mandatory — never `CREATE TYPE`.

**Tuple + bounds table pattern** (`constants.py:96-103`, risk classes) — model `SATELLITE_ANOMALY_STATUSES`, `PROJECT_EVENT_TYPES`, `PROJECT_EVENT_STATUSES`, `HISTORICAL_RECONSTRUCTION_JOB_STATUSES` the same way:
```python
RISK_CLASSES: tuple[str, ...] = ("LOW", "MODERATE", "HIGH", "VERY_HIGH", "CRITICAL")
RISK_CLASS_BOUNDS: tuple[tuple[int, str], ...] = (
    (20, "LOW"),
    (40, "MODERATE"),
    (60, "HIGH"),
    (80, "VERY_HIGH"),
    (100, "CRITICAL"),
)
RISK_CLASS_AUTO_HOLD = "CRITICAL"
```
For this phase's event-type vocabulary, D-17 locks it explicitly — write it as a closed tuple, never open-ended:
```python
# D-17: nunca DEFORESTATION automatico. Vocabulario inicial fechado.
PROJECT_EVENT_TYPES: tuple[str, ...] = (
    "VEGETATION_LOSS",
    "VEGETATION_RECOVERY",
    "POSSIBLE_FIRE",
)
# D-18: DETECTED -> ANALYZED -> CONFIRMED/DISMISSED. Nunca transicao direta
# DETECTED -> CONFIRMED.
PROJECT_EVENT_STATUSES: tuple[str, ...] = (
    "DETECTED",
    "ANALYZED",
    "CONFIRMED",
    "DISMISSED",
)
```

**Public/private allowlist split pattern** (`constants.py:117-130`) — reuse this for whatever subset of satellite data is exposed on the public dossier (D-25):
```python
PUBLIC_RISK_SIGNAL_CODES: frozenset[str] = frozenset(RISK_SIGNAL_CODES)

PUBLIC_INTEGRITY_STATUSES: tuple[str, ...] = (
    "DECLARED", "VERIFIED", "UNDER_REVIEW", "ON_HOLD", "SUSPENDED", "REVOKED",
)
```

---

### `backend_app/modules/satellite/anomaly_detector.py` (service, pure/transform)

**Analog:** `backend_app/modules/integrity/risk_engine.py` (full file read, 220 lines) — **this is the single most important pattern in the phase**, explicitly called out as the model to follow in RESEARCH.md Pattern 4.

**Module-purity contract, header comment mandatory** (`risk_engine.py:1-11`):
```python
from __future__ import annotations

# Sinarca Integrity Layer -- Risk Engine (Phase 04.2 / INTG-04, Bible secoes 21-23/42).
#
# Modulo PURO: proibido importar o driver assincrono de banco ou qualquer
# modelo do ORM. Entradas sao dataclasses simples; a leitura do banco
# (Claim/Evidence/Conflict) fica inteiramente no IntegrityService (service.py).
# Isso torna compute_signals/score_from_signals/risk_class_for_score testaveis
# sem banco (tests/test_risk_engine.py) e garante que o recalculo seja sempre
# idempotente: mesma entrada -> mesma saida, sem estado acumulado.
```
Copy this exact discipline into `anomaly_detector.py`: **no SQLAlchemy import, no `AsyncSession`, no ORM model** — only frozen dataclasses as input/output (`ObservationSnapshot` in, `AnomalySignal`/similar out), read/written to DB exclusively by `satellite/service.py`.

**Frozen dataclass snapshot pattern** (`risk_engine.py:30-52`):
```python
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
```
Model `ObservationSnapshot` (ndvi_mean, ndmi_mean, nbr_mean, observed_at, cloud_coverage) and the anomaly detection result the same way — frozen, no defaults that mutate.

**Pure function signature + settings injection pattern** (`risk_engine.py:55-59`, `191-202`):
```python
def compute_signals(
    claims: Sequence[ClaimSnapshot],
    conflicts: Sequence[ConflictSnapshot],
    settings: Settings | None = None,
) -> list[RiskSignalDTO]:
    config = settings or get_settings()
    ...

def score_from_signals(signals: Sequence[RiskSignalDTO]) -> int:
    total = sum(s.weight for s in signals)
    return max(0, min(100, int(round(total))))
```
`anomaly_detector.py`'s `detect_anomaly(observations: Sequence[ObservationSnapshot], settings: Settings | None = None) -> AnomalySignal | None` should follow exactly this shape: config comes from `Settings`/`get_settings()` (never a hardcoded threshold), consecutive-month NDVI comparison uses `config.satellite_ndvi_drop_threshold` (mirrors `config.integrity_risk_weight_*`).

**Test-purity payoff** — see `tests/test_risk_engine.py` pattern below; this module must be testable with zero DB/event loop, exactly like `compute_signals`.

---

### `backend_app/modules/integrity/risk_engine.py` (MODIFIED — extend `compute_signals`)

**Analog:** itself, current signature and one existing signal block (`risk_engine.py:55-94`)

**Exact extension point** (RESEARCH.md Pattern 4, to implement verbatim):
```python
def compute_signals(
    claims: Sequence[ClaimSnapshot],
    conflicts: Sequence[ConflictSnapshot],
    satellite_events: Sequence[ProjectEventSnapshot] = (),  # NEW parameter, default empty — keeps existing callers/tests working unchanged
    settings: Settings | None = None,
) -> list[RiskSignalDTO]:
    ...
    confirmed_critical = [e for e in satellite_events if e.status == "CONFIRMED" and e.severity == "CRITICAL"]
    confirmed_high = [e for e in satellite_events if e.status == "CONFIRMED" and e.severity == "HIGH"]
    if confirmed_critical:
        signals.append(RiskSignalDTO(
            code="SATELLITE_ANOMALY_CONFIRMED_CRITICAL",
            weight=float(config.integrity_risk_weight_satellite_anomaly_critical),
            reason=f"+{weight:.0f} Anomalia satelital confirmada de severidade crítica",
            public_safe=True,
            metadata={"count": len(confirmed_critical)},
        ))
    # analogous block for confirmed_high, lower weight
```
Follow the exact bucket style already used for overlap signals (`risk_engine.py:72-94`): one signal max per bucket, count goes in `reason`/`metadata`, never multiplies weight. Sort order is untouched — `signals.sort(key=lambda s: (-s.weight, _SIGNAL_ORDER.get(s.code, len(_SIGNAL_ORDER))))` (`risk_engine.py:187`) automatically places new codes correctly once added to `RISK_SIGNAL_CODES` (see constants.py below); no change needed to the sort itself.

---

### `backend_app/modules/integrity/constants.py` (MODIFIED — extend `RISK_SIGNAL_CODES`)

**Analog:** itself, `constants.py:106-115`

**Exact diff, confirmed safe by direct read of the migration** (`supabase/migrations/202608170002_integrity_risk_assessments.sql:21-24` — `risk_signals.code` is `text not null`, **no CHECK constraint** exists on this column, resolving RESEARCH.md Open Question 1: no migration is needed for this specific column):
```python
RISK_SIGNAL_CODES: tuple[str, ...] = (
    "OVERLAP_CRITICAL",
    "OVERLAP_HIGH",
    "OVERLAP_MEDIUM",
    "OVERLAP_LOW",
    "DOUBLE_CLAIM",
    "LAND_CLAIM_UNVERIFIED",
    "CLAIM_EVIDENCE_PENDING",
    "POSSESSION_WITHOUT_TITLE",
    # NEW — Phase 05 / D-20
    "SATELLITE_ANOMALY_CONFIRMED_CRITICAL",
    "SATELLITE_ANOMALY_CONFIRMED_HIGH",
)
```
Also append to `PUBLIC_RISK_SIGNAL_CODES` derivation is automatic (`frozenset(RISK_SIGNAL_CODES)`, `constants.py:120`) — no separate edit needed there.

---

### `backend_app/modules/integrity/service.py` (MODIFIED — extend `recalculate_risk_score`)

**Analog:** itself, full method read (`service.py:707-852`)

**Exact insertion point** — a 4th query alongside the existing 3, same shape:
```python
# Fonte: backend_app/modules/integrity/service.py:725-733 (padrao a replicar)
claims = (
    await self.session.execute(select(Claim).where(Claim.project_id == project.id))
).scalars().all()
evidence = (
    await self.session.execute(select(Evidence).where(Evidence.project_id == project.id))
).scalars().all()
conflicts = (
    await self.session.execute(select(Conflict).where(Conflict.project_id == project.id))
).scalars().all()
# NEW — Phase 05:
project_events = (
    await self.session.execute(
        select(ProjectEvent).where(
            ProjectEvent.project_id == project.id,
            ProjectEvent.status == "CONFIRMED",
        )
    )
).scalars().all()
```
Then build `satellite_event_snapshots` the same way `claim_snapshots`/`conflict_snapshots` are built (`service.py:740-759`) and pass as the new `satellite_events=` kwarg into `compute_signals(...)` (`service.py:761`).

**Append-only assessment + audit trail pattern, do not alter** (`service.py:772-850`) — the new signal flows through this unchanged machinery automatically: `ProjectRiskAssessment` row + one `RiskSignal` row per signal + `create_audit_event(action="RISK_RECALCULATED", ...)` + conditional `create_audit_event(action="INTEGRITY_AUTO_HOLD", ...)` when `auto_hold and previous_integrity_status != "ON_HOLD"`. **Do not add a second/parallel `ON_HOLD` write path** — D-20/RESEARCH anti-pattern is explicit that Auto Hold has exactly one writer, this method (`service.py:812-813`: `project.risk_score = score; project.integrity_status = integrity_status`).

---

### `backend_app/modules/projects/service.py` (MODIFIED — `create_project` hook + `deterministic_baseline` fallback)

**Analog:** itself, full reads of both regions (`service.py:802-901`, `service.py:1889-1900`)

**Current synchronous baseline call, exact line to replace the *result of*, not the function itself** (`service.py:817-820`):
```python
friendly_id = await self._next_friendly_id()
baseline = deterministic_baseline(payload)
now = datetime.now(timezone.utc)
source_hash = "baseline-" + baseline.baseline_hash
```
D-07/SATM-07 requires: `deterministic_baseline()` keeps existing exactly as-is (seed/test fallback only, `service.py:1889-1900` untouched) — but `create_project` must additionally enqueue `HISTORICAL_RECONSTRUCTION` (new job row + APScheduler `add_job`) **without removing** the synchronous `deterministic_baseline()` call used to populate the initial `ProjectBaseline` row placeholder at creation time (`service.py:870-881`, `ProjectBaseline(...)`) — the real Sentinel data supersedes it asynchronously once the job completes; the metadata flags already present (`service.py:858-864`: `"baseline_source": "deterministic_baseline"`, `"sentinel_status": "BLOCKED_MISSING_PROVIDER_CREDENTIALS"`) are the exact fields the historical reconstruction worker must overwrite on completion (`"baseline_source": "COPERNICUS"`, `"sentinel_status": "..."`).

**`metadata_` dict as the existing "provider status" surface** (`service.py:858-864`) — this is the same field `MrcaDetails.tsx` already reads (`metadata.baseline_source`, `metadata.sentinel_status`, confirmed at `MrcaDetails.tsx:464/468`) — the historical reconstruction worker updates this same `project.metadata_` dict in place, no new column needed for the status flags themselves (only the new `satellite_observations` table holds the real numeric data).

---

### `backend_app/modules/audit/routes.py` (MODIFIED — real upload + signature stub)

**Analog:** itself, full file read (135 lines) + `upload_project_document` (`backend_app/modules/projects/routes.py:485-565`, full block read) for the pipeline to reuse (D-01/D-02).

**Current state to replace** — `evidencias_url: list[str] = []` accepted as raw strings (`audit/routes.py:28`), and persisted verbatim (`audit/routes.py:73`: `audit.evidence_urls = payload.evidencias_url`). D-02 requires this list to become `Document.id`s from real uploads of the *same audit session*.

**Reusable upload pipeline, exact pieces to import (never re-implement)** (`projects/routes.py:1-73`, `484-564`):
```python
# Fonte: backend_app/modules/projects/routes.py:49-73 — validacao/hash, reaproveitar tal como esta
async def _validated_upload_payload(document_type: str, file: UploadFile) -> dict[str, object]:
    normalized_document_type = document_type.strip().upper()
    if not normalized_document_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tipo de documento é obrigatório")
    filename = file.filename or "upload"
    extension = PurePath(filename).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Extensão de arquivo não permitida")
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Arquivo excede o limite configurado")
    validate_magic_bytes(extension, content)
    return {
        "document_type": normalized_document_type, "filename": filename, "extension": extension,
        "content": content, "content_type": file.content_type,
        "sha256": hashlib.sha256(content).hexdigest(), "mime_type": MIME_BY_EXTENSION[extension],
        "size_bytes": len(content),
    }
```
```python
# Fonte: backend_app/modules/projects/routes.py:519-550 — location + storage + Document + Evidence, reaproveitar
location = project_document_location(project.friendly_id, str(upload["document_type"]), str(upload["sha256"]), str(upload["extension"]))
await upload_storage_object(location.bucket, location.object_path, bytes(upload["content"]), str(upload["mime_type"]))
document = Document(
    project_id=project.id, document_type=str(upload["document_type"]),
    storage_bucket=location.bucket, storage_object_path=location.object_path, storage_path=location.uri,
    sha256_hash=str(upload["sha256"]), mime_type=str(upload["mime_type"]), size_bytes=int(upload["size_bytes"]),
    metadata_={"filename": upload["filename"], "content_type": upload["content_type"]},
)
session.add(document)
await session.flush()
await IntegrityService(session).create_evidence_for_document(document, project=project, actor_id=current_user.id, actor_role=current_user.role)
```
A new endpoint (e.g. `POST /audit/{project_id}/evidence`) must call this exact sequence with `document_type="AUDIT_EVIDENCE"` (a new value, since `document_type` is free `text` in `Document` — confirm no CHECK constraint exists there the same way it was confirmed absent on `risk_signals.code`). The existing dedup-by-hash branch (`projects/routes.py:495-517`, returns the existing `Document` if `(project_id, document_type, sha256)` already matches) must be preserved verbatim — it is what makes repeated uploads of the same evidence idempotent.

**Signature stub — exact hash recipe from D-03**, computed server-side only, never trust a client-supplied `assinatura_digital` string again:
```python
# D-03: hash SHA-256 de {auditor_id}|{project_id}|{laudo_texto}|{timestamp}|{lista_ordenada_de_evidence_ids}
raw = f"{auditor_id}|{project.id}|{laudo_texto}|{timestamp.isoformat()}|{','.join(sorted(evidence_ids))}"
digital_signature = hashlib.sha256(raw.encode("utf-8")).hexdigest()
```
Store in `Audit.digital_signature` (column already exists, `audit/routes.py:74`) — the request field can keep the name `assinatura_digital` for compatibility, but the **value must be recomputed on the server**, discarding whatever the client sends (mirrors `stellar.py`'s "never simulate success" fail-closed principle cited explicitly in D-03).

**Unchanged machinery to preserve exactly** (`audit/routes.py:77-95`): the `project.timeline` append, `create_audit_event(action=f"AUDIT_{payload.status}", ...)` call, and `_unlock_credits`/`_block_credits` helpers (`audit/routes.py:116-127`) — these are the exact hooks D-23's `credit_adjustment_pendencies` should sit beside, not replace.

---

### `backend_app/modules/satellite/routes.py` (NEW — controller)

**Analog:** `backend_app/modules/audit/routes.py` (role guard, org-scoped pattern) + `backend_app/modules/projects/routes.py` (`upload_project_document` shape for evidence sub-resources)

**Role guard pattern to copy verbatim** (`audit/routes.py:33-37`, `projects/routes.py:489`):
```python
@router.get("/audit/queue", response_model=QueueResponse)
async def audit_queue(
    _: AuthenticatedUser = Depends(require_role("auditor", "admin")),
    session: AsyncSession = Depends(get_session),
) -> QueueResponse:
    ...
```
New routes (`/projects/{id}/satellite/observations`, `/projects/{id}/environmental-events`, `PATCH .../events/{event_id}/decision`) must use `require_role(...)` the same way, and — per RESEARCH.md Security Domain V4 — the same org-scoped ownership guard already used for `boundary-overlaps` (Phase 04.1, cited as "reveals existence/proximity of third-party projects", same sensitivity class as anomaly/event data).

---

### Migrations — `supabase/migrations/*_satellite_*.sql` (NEW)

**Analog:** `supabase/migrations/202608170001_integrity_claims_evidence_conflicts.sql` (full file read, 116 lines) — RESEARCH.md already extracted the exact `satellite_observations` DDL from this pattern (Code Examples section); reproduced here verbatim as the pattern to replicate for `satellite_anomalies`/`project_events`/`satellite_evidence`/`copernicus_api_usage` as well:

```sql
-- Padrao exato a seguir para toda tabela operacional interna desta fase
create table if not exists satellite_observations (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id),
  provider text not null default 'COPERNICUS',
  satellite text not null default 'SENTINEL_2',
  product text not null default 'L2A',
  scene_id text not null,
  processing_version text not null default 'v1',
  observed_at timestamptz not null,
  cloud_coverage numeric(5, 2),
  ndvi_mean numeric(6, 4),
  ndvi_min numeric(6, 4),
  ndvi_max numeric(6, 4),
  ndmi_mean numeric(6, 4),
  nbr_mean numeric(6, 4),
  valid_pixel_percentage numeric(5, 2),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- D-15: idempotency exigida pelo CONTEXT.md
create unique index if not exists satellite_observations_idempotency_idx
  on satellite_observations (project_id, satellite, scene_id, processing_version);
create index if not exists satellite_observations_project_observed_idx
  on satellite_observations (project_id, observed_at desc);

alter table satellite_observations enable row level security;
revoke insert, update, delete on satellite_observations from anon, authenticated;
-- D-16: sem policy de select — leitura so via /api/v1 org-scoped.
```

**`do $$ ... end $$` idempotent guard pattern for altering an existing table** (`202608170001_...sql:82-105`, used when adding columns/constraints to `projects` rather than creating new tables) — reuse if the plan needs to add columns to `projects` for satellite monitoring flags:
```sql
alter table projects add column if not exists integrity_status text not null default 'DECLARED';
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'projects_integrity_status_check'
      and conrelid = 'projects'::regclass
  ) then
    alter table projects
      add constraint projects_integrity_status_check
      check (integrity_status in (...));
  end if;
end $$;
```

**RLS footer pattern, mandatory on every new table** (`202608170001_...sql:107-116`):
```sql
alter table claims enable row level security;
alter table evidence enable row level security;
alter table conflicts enable row level security;
revoke insert, update, delete on claims, evidence, conflicts from anon, authenticated;
-- Sem policy de select: [justificativa de sensibilidade] — exposicao apenas via /api/v1 com guard org-scoped.
```

---

### `supabase/migrations/*_credit_adjustment_pendencies.sql` (NEW)

**Analog:** `supabase/migrations/202608150001_certification_workbench.sql` (`certification_pendencies`, full block read, lines 13-34) — D-23 explicitly models `credit_adjustment_pendencies` on this table:
```sql
create table if not exists certification_pendencies (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id),
  certification_id uuid references certifications(id),
  certifier_organization_id uuid references organizations(id),
  raised_by_profile_id uuid references profiles(id),
  category text not null,
  description text not null,
  status text not null default 'OPEN' check (status in ('OPEN', 'RESOLVED', 'CANCELLED')),
  producer_response text,
  responded_by_profile_id uuid references profiles(id),
  responded_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists certification_pendencies_project_status_idx
  on certification_pendencies (project_id, status, created_at desc);
create index if not exists certification_pendencies_status_idx
  on certification_pendencies (status, created_at desc);
```
`credit_adjustment_pendencies` should replace `certification_id`/`certifier_organization_id` with `project_event_id uuid references project_events(id)` (the confirmed anomaly that triggered it), keep `status`/`category`/`description`/`metadata` shape identical, and add `affected_area_ha numeric(14, 4)` per D-23. Same RLS footer as above (`revoke insert, update, delete ... from anon, authenticated`, no select policy — same sensitivity class as `certification_pendencies`, `202608150001_...sql:58-65`).

---

### `tests/modules/satellite/test_anomaly_detector.py` (NEW — pure unit test)

**Analog:** `tests/test_risk_engine.py` (full file read, 208 lines) — **exact structural match**, this is explicitly the model RESEARCH.md cites ("`tests/test_risk_engine.py` já testa `compute_signals`/`score_from_signals` como funções puras... confirmando que o padrão de teste unitário puro é o esperado para o novo `anomaly_detector.py`").

**File header + no-DB discipline** (`test_risk_engine.py:1-16`):
```python
from __future__ import annotations

# Primeiro arquivo de teste 100% sem banco do repo (Phase 04.2 / INTG-04).
# Sem cliente HTTP, sem event loop, sem fabrica de sessao de banco. Apenas
# chamadas diretas as funcoes puras do risk_engine com dataclasses em memoria.

from backend_app.core.config import Settings
from backend_app.modules.integrity.risk_engine import (
    ClaimSnapshot, ConflictSnapshot, RiskSignalDTO,
    compute_signals, integrity_status_for, risk_class_for_score, score_from_signals,
)
```
Adapt this exact header for `anomaly_detector.py` — import only dataclasses/pure functions, `backend_app.core.config.Settings`, nothing from `backend_app.db.*`.

**Factory-function-for-fixtures pattern** (`test_risk_engine.py:19-36`):
```python
def _claim(type: str = "RIGHT_TO_OPERATE", status: str = "DECLARED", has_evidence: bool = False, has_verified_evidence: bool = False) -> ClaimSnapshot:
    return ClaimSnapshot(type=type, status=status, has_evidence=has_evidence, has_verified_evidence=has_verified_evidence)

def _conflict(type: str = "GEOSPATIAL_OVERLAP", severity: str = "CRITICAL", status: str = "OPEN", overlap_percentage: float = 80.0) -> ConflictSnapshot:
    return ConflictSnapshot(type=type, severity=severity, status=status, overlap_percentage=overlap_percentage)
```
Use `_observation(ndvi_mean=..., observed_at=..., cloud_coverage=...)` factories the same way.

**Settings-injection test, critical for D-13/D-17 (config-driven thresholds, never hardcoded)** (`test_risk_engine.py:156-161`):
```python
def test_weights_come_from_settings_not_hardcoded() -> None:
    custom_settings = Settings(integrity_risk_weight_double_claim=99.0)
    signals = compute_signals([], [_conflict(type="DOUBLE_CLAIM", severity="CRITICAL")], settings=custom_settings)
    double_claim = [s for s in signals if s.code == "DOUBLE_CLAIM"]
    assert len(double_claim) == 1
    assert double_claim[0].weight == 99.0
```
Write the analogous `test_ndvi_drop_threshold_comes_from_settings_not_hardcoded` for `anomaly_detector.py` using `Settings(satellite_ndvi_drop_threshold=...)`.

**Determinism + vocabulary-closure test pattern** (`test_risk_engine.py:122-127`) — write the D-17 guarantee ("never `DEFORESTATION`") as an explicit assertion the same way `test_signal_reasons_never_mention_other_projects` (`test_risk_engine.py:140-153`) asserts a negative:
```python
def test_compute_signals_is_pure_and_deterministic() -> None:
    claims = [...]; conflicts = [...]
    first = compute_signals(claims, conflicts)
    second = compute_signals(claims, conflicts)
    assert first == second
```
```python
# Padrao analogo obrigatorio em anomaly_detector: garantir vocabulario fechado
def test_anomaly_never_labels_deforestation_directly() -> None:
    result = detect_anomaly(observations_with_sharp_ndvi_drop())
    assert result.event_type in {"VEGETATION_LOSS", "VEGETATION_RECOVERY", "POSSIBLE_FIRE"}
    assert result.event_type != "DEFORESTATION"
```

---

### `tests/adapters/test_copernicus.py` (NEW — adapter test)

**Analog:** `tests/adapters/test_blockchain_financial_adapters.py` (relevant excerpt, lines 1-80 read) — same directory, same fail-closed assertion style:
```python
def test_stellar_testnet_mode_fails_closed_without_required_secrets() -> None:
    sponsor = StellarReserveSponsor(StellarAdapterConfig(mode="testnet", network="testnet"))
    with pytest.raises(RuntimeError, match="Configuração Stellar incompleta"):
        sponsor.sponsor_account_and_trustline("PRC-2026-001", "GPRODUCER", "SINARCA")
```
Write `test_copernicus_provider_fails_closed_without_credentials`:
```python
async def test_copernicus_search_scenes_fails_closed_without_credentials() -> None:
    provider = CopernicusProvider(CopernicusAdapterConfig(client_id=None, client_secret=None))
    with pytest.raises(RuntimeError, match="Configuração Copernicus incompleta"):
        await provider.search_scenes(aoi=..., date_from=..., date_to=...)
```
For the "configured, mocked HTTP" tests (token/STAC/Statistical happy path), no `respx`/`httpx.MockTransport` precedent exists yet in the repo (confirmed by RESEARCH.md Wave 0 Gaps) — use `httpx.MockTransport` (zero new dependency, already part of `httpx`) passed into `httpx.AsyncClient(transport=...)` rather than adding `respx` as a new dev dependency, consistent with the project's general "don't add a dependency when the stdlib/existing lib already solves it" posture (mirrors the `sentinelhub-py` rejection rationale in RESEARCH.md).

---

### `src/pages/Dashboard/MonitoringNDVI.tsx` (MODIFIED — retire simulation, keep dark shell)

**Analog:** itself (current file, full 268 lines read) is simultaneously the target file and its own primary analog — UI-SPEC.md's "Critical finding on Surface B" is the authoritative framing: **evolve, do not rewrite.**

**What is currently 100% simulated and MUST be replaced (verbatim current code, for reference of exactly what to remove):**
```tsx
// Line 18 — hardcoded project, MUST become a route param
const MONITORED_PROJECT_ID = 'PRC-2024-002';
```
```tsx
// Lines 36-53 — fetches via database.getMonitoringProject(), which is
// backed by deterministic_baseline() server-side (SATM-07 violation source)
const loadMonitoring = async () => {
    const response = await database.getMonitoringProject(MONITORED_PROJECT_ID);
    setMonitoring(response);
};
```
```tsx
// Lines 134-148 — the fake map: a static <img> with CSS filters, NOT a real map
<div className="absolute inset-0">
    <img
        src={project.image}
        className={`w-full h-full object-cover transition-all duration-1000 ${viewMode === 'ndvi' ? 'hue-rotate-[80deg] saturate-[1.5] brightness-[0.8]' : viewMode === 'thermal' ? 'invert sepia saturate-[2]' : ''}`}
        alt="Map View"
    />
    <div className="absolute inset-0 border-[4px] border-sinarca-neon/30 m-20 rounded-[4rem] shadow-[inset_0_0_100px_rgba(0,255,148,0.2)] flex items-center justify-center">
        ...ÁREA SOB CUSTÓDIA...
    </div>
</div>
```
```tsx
// Lines 151-170 — the existing 3-button viewMode chip group (UI-SPEC.md: extend
// this exact chip class to 7 layers, split into 2 independent groups)
<button
    onClick={() => setViewMode('ndvi')}
    className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${viewMode === 'ndvi' ? 'bg-sinarca-neon text-sinarca-forest border-sinarca-neon' : 'bg-black/50 text-white border-white/10 backdrop-blur-md'}`}
>
    Índice NDVI
</button>
```

**What MUST be kept exactly as-is (dark shell, card chrome, metric cards, timeline sidebar):**
```tsx
// Lines 97-127 — header/status card (UI-SPEC.md: "unchanged")
<div className="bg-sinarca-deep border border-sinarca-border rounded-xl p-3 flex flex-col items-end">
    <span className="text-[10px] text-text-muted uppercase font-bold tracking-tighter">Status da Reserva</span>
    <div className={`flex items-center gap-2 ${protectedProject ? 'text-sinarca-neon' : 'text-orange-400'}`}>
        <ShieldCheck className="w-5 h-5" />
        <span className="text-lg font-bold uppercase tracking-widest">{protectedProject ? 'Protegido' : 'Bloqueado'}</span>
    </div>
</div>
```
```tsx
// Lines 172-183 — NDVI legend card shell to KEEP for the base-layer NDVI view
<div className="absolute bottom-6 left-6 bg-black/60 backdrop-blur-xl border border-white/10 p-4 rounded-2xl max-w-[200px]">
    <div className="flex justify-between text-[8px] text-gray-400 uppercase font-bold mb-2">
        <span>Baixa Vegetação</span><span>Densa</span>
    </div>
    <div className="h-2 w-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded-full mb-3"></div>
    ...
</div>
```
```tsx
// Lines 225-244 — "Atividades Recentes" icon-dot-connector list, exact pattern
// to reuse for the new anomaly/event list (UI-SPEC.md Component Inventory)
<div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-white/10">
    {activityItems.map((item) => {
        const Icon = item.icon;
        return (
            <div key={item.id} className="relative pl-8">
                <div className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-sinarca-deep border border-current flex items-center justify-center z-10 ${item.color}`}>
                    <Icon className="w-3 h-3" />
                </div>
                <p className="text-xs font-bold text-white">{item.title}</p>
                <p className="text-[10px] text-text-muted mb-1">{item.description}</p>
                <span className="text-[9px] text-gray-600 font-mono">{item.date}</span>
            </div>
        );
    })}
</div>
```
```tsx
// Lines 249-264 — metric card grid, reuse shape, swap data source
<div className="bg-sinarca-deep border border-sinarca-border rounded-2xl p-6 hover:bg-white/5 transition-colors group">
    ...
    <p className="text-[10px] text-text-muted uppercase font-bold tracking-widest mb-1">{stat.label}</p>
    <p className="text-2xl font-serif font-bold text-white">{stat.val}</p>
</div>
```

**Second analog for the real map — `src/components/ProjectGeofencePreview.tsx`** (full Leaflet init/base-layer/marker effects read, lines 1-100 + 190-290) — this is the exact mount logic to port into `MonitoringNDVI.tsx`'s map card, replacing the `<img>` block above:
```tsx
// Fonte: src/components/ProjectGeofencePreview.tsx:1-4 — imports
import L, { type LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
```
```tsx
// Fonte: ProjectGeofencePreview.tsx:194-222 — map mount/unmount effect (init once)
useEffect(() => {
    if (!shouldRenderMap) {
        mapRef.current?.remove();
        mapRef.current = null;
        return undefined;
    }
    if (!mapContainerRef.current || mapRef.current) return undefined;

    const map = L.map(mapContainerRef.current, {
        attributionControl: true,
        scrollWheelZoom: true,
        zoomControl: true,
    });
    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layer;
    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
        map.remove();
        mapRef.current = null;
        layerRef.current = null;
    };
}, [shouldRenderMap]);
```
```tsx
// Fonte: ProjectGeofencePreview.tsx:36-47 — base layer config (RGB base layer
// for the new 4-way base-layer group: this is exactly the "RGB" option)
const PREVIEW_BASE_LAYERS = {
    street: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 },
    satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community', maxZoom: 19 },
};
```
```tsx
// Fonte: ProjectGeofencePreview.tsx:244-284 — polygon/marker render + fitBounds,
// reuse for the Boundary overlay layer (AOI = active_boundary, Phase 04.1)
const leafletPoints = mapPoints.map((point) => [point.latitude, point.longitude] as LatLngExpression);
if (hasArea) {
    L.polygon(leafletPoints, { color: '#047857', fillColor: '#16a34a', fillOpacity: 0.24, opacity: 0.95, weight: 3 }).addTo(layer);
}
mapPoints.forEach((point) => {
    L.marker([point.latitude, point.longitude], { icon: markerIcon(point.vertex_label, hasArea), keyboard: true, title: `Vértice ${point.vertex_label}` }).addTo(layer);
});
const leafletBounds = L.latLngBounds(leafletPoints);
map.fitBounds(leafletBounds.pad(0.25), { animate: false, maxZoom: 15 });
```
NDVI/NDMI/NBR base layers need a *new* tile source or colored overlay (Sentinel Hub WMS/tile endpoint, not in `PREVIEW_BASE_LAYERS` today) — but the mount/teardown/`layerRef.clearLayers()` mechanics above transfer directly; only the tile URL config and the boundary-color styling (dark chrome per UI-SPEC Color contract, `#00ff94` accents instead of `#047857`/`#16a34a`) differ.

**Timeline chart (NDVI/NDMI/NBR) — inline SVG, no chart library** (UI-SPEC.md explicit instruction) — analog is the `technicalPreview()` SVG renderer referenced in `ProjectGeofencePreview.tsx` (grid/satellite technical view, `<svg viewBox="0 0 100 100">` with `<path>`/`<rect>` primitives) — reuse the `viewBox="0 0 100 100"` normalized-coordinate technique for plotting NDVI/NDMI/NBR as `<path>` lines, never add `recharts`/`chart.js`/etc.

---

### `src/pages/Dashboard/AuditorReview.tsx` (MODIFIED — real upload, signature stub, NFC re-read)

**Analog:** itself (relevant excerpts read: lines 1-100, 220-320, 460-590)

**Current fake-upload code to replace** (`AuditorReview.tsx:226-249`):
```tsx
const addEvidenceFiles = (project: AuditItem, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const projectKey = project.friendlyId || project.id;
    const timestamp = Date.now();
    const selectedFiles = Array.from(files);
    const acceptedFiles = selectedFiles.filter((file) => file.size <= MAX_AUDIT_EVIDENCE_FILE_SIZE_BYTES);
    const rejectedFiles = selectedFiles.filter((file) => file.size > MAX_AUDIT_EVIDENCE_FILE_SIZE_BYTES);
    const evidenceFiles = acceptedFiles.map((file, index) => ({
        id: `${timestamp}-${index}-${file.name}`,
        name: file.name,
        size: file.size,
        type: file.type || 'arquivo local',
        localUrl: `local://auditoria/${projectKey}/${encodeURIComponent(file.name)}`,  // <-- D-01: this line must go, no more local:// blobs
    }));
    ...
};
```
```tsx
// Lines 275-296 — current verify() sends localUrl strings and free-text signature
const verify = async (project: AuditItem, status: AuditDecision) => {
    ...
    const evidenceUrls = [
        ...(monitoring?.baseline.evidenceUri ? [monitoring.baseline.evidenceUri] : []),
        ...draft.evidenceFiles.map((file) => file.localUrl),  // <-- must become Document.id from real upload
    ];
    await apiPatch(`/audit/verify/${encodeURIComponent(project.id)}`, {
        status,
        laudo_texto: buildAuditReport(project, monitoring, draft, status),
        latitude, longitude,
        evidencias_url: evidenceUrls,
        assinatura_digital: draft.signature,  // <-- becomes read-only, server-computed stub display, not user input
        auditor_id: 'aud-005',
    });
};
```
```tsx
// Line 585-587 — free-text signature <input>, D-03 requires this become read-only display
<label className="block space-y-1">
    <span className="text-xs font-bold uppercase text-gray-400">Assinatura digital</span>
    <input value={draft.signature} onChange={(event) => updateDraft('signature', event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500" />
</label>
```

**Real upload pattern to copy, from `src/services/projectDocuments.ts`** (full file read, exact frontend analog for D-01):
```tsx
// Fonte: src/services/projectDocuments.ts:33-60 — padrao exato de upload real com FormData
export const uploadProjectDocument = async (
    projectId: string,
    documentType: ProjectDocumentType,
    file: File,
): Promise<UploadedProjectDocument> => {
    const body = new FormData();
    body.append('document_type', documentType);
    body.append('file', file);
    const response = await apiPost<ProjectDocumentUploadResponse>(`/projects/${projectId}/documents`, body);
    if (!response) throw new Error('Upload de documento sem resposta da API.');
    return {
        id: response.id, projectId: response.project_id, documentType: response.document_type,
        filename: response.filename || file.name, mimeType: response.mime_type, sizeBytes: response.size_bytes,
        sha256: response.sha256, storageBucket: response.storage_bucket,
        storageObjectPath: response.storage_object_path, storagePath: response.storage_path, status: response.status,
    };
};
```
A new `src/services/auditEvidence.ts` should follow this exact shape (`uploadAuditEvidence(projectId, file)` → `POST /audit/{project_id}/evidence` via `FormData`), and `AuditorReview.tsx`'s `addEvidenceFiles` becomes `async`, calling this per file, tracking per-row upload state (`'uploading' | 'success' | 'error'`) as UI-SPEC.md's Component Inventory row "Evidence row — uploading/success/error state" prescribes — replacing the synchronous `localUrl` construction entirely.

**`apiPost`/FormData transport already handles multipart correctly** (`src/services/api.ts:34-40`):
```ts
let body: BodyInit | undefined;
if (options.body instanceof FormData) {
    body = options.body;
} else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
}
```
No changes needed here — `apiPost(path, formData)` already skips the JSON `Content-Type` header and lets the browser set the multipart boundary, exactly what audit evidence upload needs.

**Signature stub badge — reuse the existing copy-to-clipboard interaction** (`AuditorReview.tsx:298-310`, `copyReportPreview`):
```tsx
const copyReportPreview = async (project: AuditItem) => {
    const projectKey = project.friendlyId || project.id;
    const reportPreview = buildAuditReport(project, monitoringByProject[projectKey], draft, 'APPROVED');
    try {
        await navigator.clipboard.writeText(reportPreview);
        setCopiedProjectId(projectKey);
        window.setTimeout(() => setCopiedProjectId((current) => current === projectKey ? null : current), 1800);
    } catch {
        setEvidenceError('Não foi possível copiar o relatório para a área de transferência.');
    }
};
```
UI-SPEC.md's signature-stub badge reuses this exact `navigator.clipboard.writeText` + timed `copiedProjectId` reset pattern for copying the SHA-256 hash string, with the `Fingerprint` icon already imported (`AuditorReview.tsx:13`).

**Fail-closed NFC re-read — consume `fieldCapture.ts` exactly as-is, no changes to that file:**
```ts
// Fonte: src/services/fieldCapture.ts:53-57 — reaproveitar tal como esta
export const getNfcCaptureStatus = (): NfcCaptureStatus => {
    const capabilities = detectFieldCapabilities();
    if (capabilities.nfc === 'unsupported') return 'unsupported';
    return 'blocked_missing_credentials';
};
```
`AuditorReview.tsx` imports `detectFieldCapabilities`/`getNfcCaptureStatus` from `../../services/fieldCapture` and renders the amber banner (UI-SPEC.md Copywriting Contract: "Leitor NFC indisponível neste dispositivo.") whenever `getNfcCaptureStatus() !== 'available'` — this function never returns a success state on its own, matching D-04's fail-closed requirement without any new client-side capability detection code.

---

### `src/pages/Dashboard/MrcaDetails.tsx` (MODIFIED — real baseline tiles)

**Analog:** itself, exact tile block read (`MrcaDetails.tsx:442-474`)

**Current amber-always tiles to make conditional** (D-25/SATM-07):
```tsx
<div className="p-5 rounded-xl bg-amber-50 border border-amber-100">
    <p className="text-[10px] uppercase font-bold text-amber-700">Fonte do baseline</p>
    <p className="font-bold text-amber-900 mt-1">{technicalStatusLabel(metadata.baseline_source || metadata.baseline_adapter)}</p>
</div>
<div className="p-5 rounded-xl bg-amber-50 border border-amber-100">
    <p className="text-[10px] uppercase font-bold text-amber-700">Status Sentinel</p>
    <p className="font-bold text-amber-900 mt-1">{technicalStatusLabel(metadata.sentinel_status)}</p>
</div>
```
Per UI-SPEC.md Color contract ("amber here means 'blocked', not 'satellite data in general'"), these two `div`s must branch: when `metadata.baseline_source === 'COPERNICUS'` (real data present), render with the **same class as the sibling tiles above them** (`bg-gray-50 border-gray-100`, `MrcaDetails.tsx:446/450/454/458`), not amber. The amber classes stay reserved for the genuine fail-closed case (`sentinel_status === 'BLOCKED_MISSING_PROVIDER_CREDENTIALS'`).

**Sibling non-amber tile pattern to reuse for the "real" state** (`MrcaDetails.tsx:446-461`):
```tsx
<div className="p-5 rounded-xl bg-gray-50 border border-gray-100">
    <p className="text-[10px] uppercase font-bold text-gray-400">Referência Sentinel</p>
    <p className="font-mono break-all mt-1">{dossier.baseline.sentinelSceneId}</p>
</div>
```
`dossier.baseline` already exists as an object (`ndviMean`, `pointsAnalyzed`, `baselineHash`, `sentinelSceneId`) — the plan should replace the *source* of these fields (currently populated via `ProjectBaseline` seeded from `deterministic_baseline()`) with real `satellite_observations` aggregates, without changing this rendering block's shape at all — same `dossier.baseline.*` field names if the backend DTO is kept compatible, per RESEARCH.md's "D-07... Nenhum outro código sobrevive senão como fallback".

**`technicalStatusLabel`/metadata mapping precedent** (`MrcaDetails.tsx:132`):
```tsx
deterministic_baseline: 'Baseline determinístico local',
```
This label map entry must gain a new key for whatever value `baseline_source` becomes when real (e.g. `COPERNICUS: 'Copernicus Sentinel-2 (observação real)'`), following the exact copy UI-SPEC.md locks: *"Fonte do baseline: Copernicus Sentinel-2 (observação real)"*.

---

## Shared Patterns

### Fail-closed adapter/provider (applies to `copernicus.py`, all satellite service methods that depend on it)
**Source:** `backend_app/adapters/stellar.py:36-49` (`assert_ready()`)
**Apply to:** `CopernicusProvider.search_scenes/get_statistics/get_image`, and any `satellite/service.py` method that calls them — never catch the `RuntimeError` and substitute simulated data; let it propagate as an explicit blocked state (mirrors `sentinel_status: BLOCKED_MISSING_PROVIDER_CREDENTIALS` already in `projects/service.py:864`).

### Pure-module discipline for business rules (applies to `anomaly_detector.py`)
**Source:** `backend_app/modules/integrity/risk_engine.py:1-11` (module docstring/comment) + `tests/test_risk_engine.py` (proof of testability)
**Apply to:** `backend_app/modules/satellite/anomaly_detector.py` — no ORM/DB import, frozen dataclass I/O, `Settings`-injected thresholds, deterministic (same input → same output).

### Append-only, explainable state transitions with audit trail
**Source:** `backend_app/modules/integrity/service.py:707-852` (`recalculate_risk_score` — new row per recompute, one `RiskSignal` per `RiskSignalDTO`, `create_audit_event` on every write, second conditional `create_audit_event` for Auto Hold transitions)
**Apply to:** `HistoricalReconstructionService`, `SatelliteMonitoringService`, and the `ProjectEvent` decision endpoint (`CONFIRMED`/`DISMISSED`) — every state transition writes both the domain row and a `create_audit_event(...)` call; `ProjectEvent` transitions are distinct from `audit_events` (RESEARCH.md Pitfall 5 — do not conflate the two tables).

### Idempotent migrations (`text + check`, never `ENUM`, unique index for natural keys)
**Source:** `supabase/migrations/202608170001_integrity_claims_evidence_conflicts.sql` (full file)
**Apply to:** every new table this phase creates (`satellite_observations`, `satellite_anomalies`, `project_events`, `satellite_evidence`, `copernicus_api_usage`, `credit_adjustment_pendencies`) — `create table if not exists`, `text not null check (... in (...))` for every vocabulary column, RLS enabled + DML revoked from `anon, authenticated` + no select policy, `create unique index if not exists` for the idempotency key (D-15).

### Real multipart upload → hash → Document → Evidence pipeline
**Source:** `backend_app/modules/projects/routes.py:49-73` (`_validated_upload_payload`) + `:519-550` (storage + `Document` + `IntegrityService.create_evidence_for_document`); frontend counterpart `src/services/projectDocuments.ts:33-60` (`uploadProjectDocument`) + `src/services/api.ts:34-40` (FormData transport)
**Apply to:** `audit/routes.py`'s new evidence endpoint (D-01/D-02) and `satellite/evidence.py`'s before/after PNG persistence (D-19, same hash-then-store discipline, different trigger).

### Config-driven thresholds via `Settings`, never hardcoded or DB-dynamic
**Source:** `backend_app/core/config.py:43-59` (`integrity_overlap_severity_*_pct`, `integrity_risk_weight_*`)
**Apply to:** new `Settings` fields `copernicus_client_id`/`copernicus_client_secret` (no default, `str | None`), `satellite_historical_years: int = 5`, `satellite_max_cloud_coverage_pct: float = 20.0`, `satellite_ndvi_drop_threshold: float`, `integrity_risk_weight_satellite_anomaly_critical/high: float` — same flat-field, documented-comment style as the existing block.

---

## No Analog Found

Files/infrastructure with no close match in the codebase — first-of-kind for this phase, follow RESEARCH.md's Architecture Patterns section (Pattern 3) directly since no internal precedent exists:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `backend_app/main.py` lifespan block | config (infra) | event-driven (startup/shutdown) | `main.py` today is `create_app()` with zero `@app.on_event`/`lifespan=` hooks (confirmed by full-file read, 37 lines) — this is the first lifespan hook in the repo. RESEARCH.md Pattern 3 supplies the FastAPI-official skeleton to use (`@asynccontextmanager` + `AsyncIOScheduler` start/shutdown) |
| `backend_app/modules/satellite/scheduler.py` | config (infra) | event-driven | No `APScheduler`/cron/background-loop precedent anywhere in the repo (confirmed by RESEARCH.md grep). Register jobs via `AsyncIOScheduler.add_job(...)`, called from the new `main.py` lifespan; `SQLAlchemyJobStore` decision deferred to plan per RESEARCH.md Assumption A1/Open Question 2 (single-worker deploy vs. shared jobstore) |

---

## Metadata

**Analog search scope:** `backend_app/adapters/`, `backend_app/modules/{integrity,audit,projects}/`, `backend_app/core/`, `backend_app/main.py`, `supabase/migrations/`, `tests/{adapters,}/`, `src/pages/Dashboard/`, `src/components/`, `src/services/`
**Files scanned (full or targeted read):** `stellar.py`, `storage_paths.py`, `audit/routes.py`, `main.py`, `core/config.py`, `projects/routes.py` (upload block), `projects/service.py` (create_project + deterministic_baseline), `integrity/risk_engine.py`, `integrity/constants.py`, `integrity/service.py` (recalculate_risk_score), `202608170001_integrity_claims_evidence_conflicts.sql`, `202608170002_integrity_risk_assessments.sql`, `202608150001_certification_workbench.sql`, `tests/test_risk_engine.py`, `tests/adapters/test_blockchain_financial_adapters.py`, `MonitoringNDVI.tsx` (full), `AuditorReview.tsx` (targeted), `MrcaDetails.tsx` (targeted), `fieldCapture.ts` (full), `ProjectGeofencePreview.tsx` (targeted), `projectDocuments.ts` (full), `api.ts` (targeted) — 20 files, ~2,700 lines total.
**Pattern extraction date:** 2026-08-16
