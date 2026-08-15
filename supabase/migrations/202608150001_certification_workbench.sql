-- Phase 04: bancada da certificadora.
-- 1. Decisoes de certificacao passam a ser append-only (D-09): a constraint
--    unica (project_id, decision) sobrescrevia a decisao anterior.
-- 2. Pendencias de correcao (D-04, D-08, D-10) e pacote de autorizacao de
--    tesouraria (D-18) ganham tabelas proprias.

alter table certifications drop constraint if exists certifications_project_decision_idx;
drop index if exists certifications_project_decision_idx;

create index if not exists certifications_project_created_idx
  on certifications (project_id, created_at desc);

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

create table if not exists treasury_authorizations (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id),
  certification_id uuid not null references certifications(id),
  certifier_organization_id uuid references organizations(id),
  certifier_profile_id uuid references profiles(id),
  methodology text not null,
  approved_credit_potential numeric(18, 2) not null,
  certificate_document_id uuid references documents(id),
  certificate_sha256 text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  authorized_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists treasury_authorizations_certification_idx
  on treasury_authorizations (certification_id);

create index if not exists treasury_authorizations_status_idx
  on treasury_authorizations (status, created_at desc);

alter table certification_pendencies enable row level security;
alter table treasury_authorizations enable row level security;

revoke insert, update, delete on certification_pendencies, treasury_authorizations
  from anon, authenticated;

-- Sem politicas de select: pendencias e autorizacoes sao dados operacionais
-- internos, expostos apenas pelo backend_app com auth propria e guard de papel.
