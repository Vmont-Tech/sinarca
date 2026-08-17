-- Phase 05 (SATM-05/06) — observacoes, anomalias, eventos e evidencia satelital (Bible secao 40).

create table if not exists satellite_observations (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id),
  provider text not null default 'COPERNICUS' check (provider in ('COPERNICUS')),
  satellite text not null default 'SENTINEL_2' check (satellite in ('SENTINEL_2')),
  product text not null default 'L2A' check (product in ('L2A')),
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
  source text not null default 'STATISTICAL_API',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- D-15: idempotencia exata exigida pelo CONTEXT.md e por SATM-10.
create unique index if not exists satellite_observations_idempotency_idx
  on satellite_observations (project_id, satellite, scene_id, processing_version);
create index if not exists satellite_observations_project_observed_idx
  on satellite_observations (project_id, observed_at desc);

create table if not exists satellite_anomalies (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id),
  observation_id uuid not null references satellite_observations(id),
  previous_observation_id uuid references satellite_observations(id),
  index_name text not null default 'NDVI' check (index_name in ('NDVI', 'NDMI', 'NBR')),
  value_before numeric(6, 4),
  value_after numeric(6, 4),
  drop_ratio numeric(6, 4),
  severity text not null check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  confidence numeric(5, 2),
  affected_area_ha numeric(14, 4),
  status text not null default 'PENDING_ANALYSIS'
    check (status in ('PENDING_ANALYSIS', 'ANALYZED', 'LINKED', 'DISMISSED')),
  reason text,
  detected_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Idempotencia do detector: uma anomalia por (projeto, observacao, indice).
create unique index if not exists satellite_anomalies_idempotency_idx
  on satellite_anomalies (project_id, observation_id, index_name);
create index if not exists satellite_anomalies_project_status_idx
  on satellite_anomalies (project_id, status, detected_at desc);

-- D-17: vocabulario FECHADO. Classificacao juridica de desmatamento esta
-- fora de escopo (Bible), por isso o rotulo correspondente nao existe no check.
-- ATENCAO: project_events e uma tabela de DOMINIO, distinta de audit_events
-- (trilha generica write-once). Cada transicao aqui gera TAMBEM um audit_event.
create table if not exists project_events (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id),
  anomaly_id uuid references satellite_anomalies(id),
  type text not null check (type in ('VEGETATION_LOSS', 'VEGETATION_RECOVERY', 'POSSIBLE_FIRE')),
  status text not null default 'DETECTED'
    check (status in ('DETECTED', 'ANALYZED', 'CONFIRMED', 'DISMISSED')),
  severity text not null check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  confidence numeric(5, 2),
  affected_area_ha numeric(14, 4),
  ndvi_before numeric(6, 4),
  ndvi_after numeric(6, 4),
  summary text,
  detected_at timestamptz not null default now(),
  analyzed_at timestamptz,
  decided_at timestamptz,
  decided_by_profile_id uuid references profiles(id),
  decision_notes text,
  -- D-22: desbloqueio auditavel. cleared_at nunca e preenchido por timeout;
  -- so por decisao humana explicita (ANOMALY_REVIEW_CLEARED).
  cleared_at timestamptz,
  cleared_by_profile_id uuid references profiles(id),
  clearance_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists project_events_anomaly_idx
  on project_events (anomaly_id) where anomaly_id is not null;
create index if not exists project_events_project_status_idx
  on project_events (project_id, status, detected_at desc);

create table if not exists satellite_evidence (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id),
  project_event_id uuid references project_events(id),
  anomaly_id uuid references satellite_anomalies(id),
  kind text not null check (kind in ('BEFORE_IMAGE', 'AFTER_IMAGE', 'STATISTICS_SNAPSHOT')),
  storage_bucket text not null default 'projects',
  storage_object_path text,
  storage_path text,
  sha256_hash text not null,
  mime_type text not null default 'image/png',
  size_bytes bigint,
  captured_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- D-19: no maximo um before e um after por evento.
create unique index if not exists satellite_evidence_event_kind_idx
  on satellite_evidence (project_event_id, kind) where project_event_id is not null;
create index if not exists satellite_evidence_project_idx
  on satellite_evidence (project_id, created_at desc);

alter table satellite_observations enable row level security;
alter table satellite_anomalies enable row level security;
alter table project_events enable row level security;
alter table satellite_evidence enable row level security;
revoke insert, update, delete on satellite_observations, satellite_anomalies, project_events, satellite_evidence from anon, authenticated;
-- D-16: sem policy de select. Observacao/anomalia/evento revelam estado
-- operacional e geometria de projeto de terceiro (mesma classe de
-- sensibilidade de claims/evidence/conflicts) — leitura apenas via /api/v1
-- com guard org-scoped.
