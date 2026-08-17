-- D-14: fila persistida do scheduler in-process. "Enfileirar" = inserir uma
-- linha PENDING; o poller do APScheduler consome. Sobrevive a restart.
create table if not exists satellite_jobs (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id),
  job_type text not null check (job_type in ('HISTORICAL_RECONSTRUCTION', 'CONTINUOUS_MONITORING')),
  status text not null default 'PENDING'
    check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  attempts integer not null default 0,
  observations_persisted integer not null default 0,
  anomalies_detected integer not null default 0,
  window_start timestamptz,
  window_end timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotencia do enfileiramento: no maximo um job ativo por (projeto, tipo).
create unique index if not exists satellite_jobs_active_idx
  on satellite_jobs (project_id, job_type) where status in ('PENDING', 'PROCESSING');
create index if not exists satellite_jobs_status_created_idx
  on satellite_jobs (status, created_at asc);

-- D-26: consumo Copernicus como linhas estruturadas (sem Prometheus nesta fase).
create table if not exists copernicus_api_usage (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references projects(id),
  satellite_job_id uuid references satellite_jobs(id),
  endpoint text not null check (endpoint in ('TOKEN', 'STAC_SEARCH', 'STATISTICS', 'PROCESS')),
  outcome text not null check (outcome in ('SUCCESS', 'ERROR')),
  http_status integer,
  processing_units numeric(10, 4),
  duration_ms integer,
  error_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists copernicus_api_usage_created_idx
  on copernicus_api_usage (created_at desc);
create index if not exists copernicus_api_usage_endpoint_idx
  on copernicus_api_usage (endpoint, outcome, created_at desc);

alter table satellite_jobs enable row level security;
alter table copernicus_api_usage enable row level security;
revoke insert, update, delete on satellite_jobs, copernicus_api_usage from anon, authenticated;
-- D-16/D-26: tabelas operacionais internas; consumo de quota e estado de job
-- nao sao dado publico — leitura apenas via /api/v1 interno.
