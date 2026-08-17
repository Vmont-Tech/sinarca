-- D-23: "recalculo de creditos apos incidente" NAO calcula toneladas de
-- carbono a partir de NDVI (fora de escopo na Bible). Cria uma pendencia
-- estruturada de revisao MANUAL, analoga a certification_pendencies, e o
-- projeto fica indisponivel para venda/mint enquanto o Auto Hold durar.
create table if not exists credit_adjustment_pendencies (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id),
  project_event_id uuid references project_events(id),
  raised_by_profile_id uuid references profiles(id),
  category text not null default 'SATELLITE_INCIDENT',
  description text not null,
  affected_area_ha numeric(14, 4),
  status text not null default 'OPEN' check (status in ('OPEN', 'RESOLVED', 'CANCELLED')),
  producer_response text,
  responded_by_profile_id uuid references profiles(id),
  responded_at timestamptz,
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists credit_adjustment_pendencies_project_status_idx
  on credit_adjustment_pendencies (project_id, status, created_at desc);
create unique index if not exists credit_adjustment_pendencies_event_idx
  on credit_adjustment_pendencies (project_event_id) where project_event_id is not null;

alter table credit_adjustment_pendencies enable row level security;
revoke insert, update, delete on credit_adjustment_pendencies from anon, authenticated;
-- Mesma classe de sensibilidade de certification_pendencies
-- (202608150001_certification_workbench.sql:58-65): sem policy de select.
