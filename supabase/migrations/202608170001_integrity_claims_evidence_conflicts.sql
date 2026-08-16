-- Phase 04.2 / INTG-01..03: fundacao do Sinarca Integrity Layer.
-- claims/evidence/conflicts sao tabelas OPERACIONAIS INTERNAS: RLS habilitado,
-- DML revogado de anon/authenticated e SEM policy de select. Todo acesso passa
-- pelo backend_app com auth propria e guard org-scoped.
-- D-04: projects.integrity_status NAO substitui projects.status (enum
-- operacional de 16 estados). Sao dois eixos paralelos.

create table if not exists claims (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id),
  claimant_organization_id uuid references organizations(id),
  claimant_profile_id uuid references profiles(id),
  type text not null check (type in ('LAND_OWNERSHIP', 'LAND_POSSESSION', 'RIGHT_TO_OPERATE')),
  statement text not null,
  status text not null default 'DECLARED' check (status in ('DECLARED', 'EVIDENCE_PENDING', 'EVIDENCE_VERIFIED', 'VERIFIED', 'REJECTED', 'SUPERSEDED')),
  confidence_score integer not null default 10 check (confidence_score >= 0 and confidence_score <= 100),
  valid_from timestamptz,
  valid_to timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Um Claim por (projeto, tipo): torna a criacao de Claim na originacao
-- idempotente e permite reconciliar LAND_POSSESSION -> LAND_OWNERSHIP (D-18)
-- sem duplicar linha.
create unique index if not exists claims_project_type_idx on claims (project_id, type);
create index if not exists claims_project_status_idx on claims (project_id, status, created_at desc);

create table if not exists evidence (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id),
  claim_id uuid references claims(id),
  document_id uuid references documents(id),
  type text not null,
  source text not null,
  source_type text not null default 'SELF_DECLARED' check (source_type in ('SELF_DECLARED', 'THIRD_PARTY', 'EXTERNAL_REGISTRY', 'SATELLITE', 'FIELD_AUDIT')),
  hash text not null,
  validation_method text not null check (validation_method in ('HASH_INTEGRITY', 'STRUCTURAL_COMPLETENESS')),
  validation_status text not null default 'PENDING' check (validation_status in ('PENDING', 'VERIFIED', 'FAILED', 'EXPIRED')),
  issued_at timestamptz,
  expires_at timestamptz,
  verified_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- D-07: hash sempre vem de documents.sha256_hash, nunca recomputado.
create unique index if not exists evidence_document_method_idx
  on evidence (document_id, validation_method)
  where document_id is not null;
-- Uma unica Evidence de completude estrutural por Claim (upsert logico).
create unique index if not exists evidence_claim_structural_idx
  on evidence (claim_id)
  where validation_method = 'STRUCTURAL_COMPLETENESS';
create index if not exists evidence_project_created_idx on evidence (project_id, created_at desc);
create index if not exists evidence_claim_created_idx on evidence (claim_id, created_at desc);

create table if not exists conflicts (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id),
  related_project_id uuid references projects(id),
  type text not null check (type in ('GEOSPATIAL_OVERLAP', 'DUPLICATE_PROPERTY', 'DOUBLE_CLAIM', 'DUPLICATE_DOCUMENT', 'IDENTITY_CONFLICT', 'RIGHTS_CONFLICT', 'EXTERNAL_REGISTRY_CONFLICT')),
  severity text not null check (severity in ('CLEAR', 'INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  overlap_percentage numeric(9, 4),
  overlap_area_ha numeric(14, 4),
  status text not null default 'OPEN' check (status in ('OPEN', 'RESOLVED')),
  detected_at timestamptz not null default now(),
  resolved_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- D-20: Conflict e RE-DERIVADO a cada mudanca de active_boundary. O unique
-- abaixo garante upsert por par ordenado (nao duplica apos edicao de geometria).
create unique index if not exists conflicts_project_related_type_idx
  on conflicts (project_id, related_project_id, type);
create index if not exists conflicts_project_status_idx on conflicts (project_id, status, severity);

alter table projects add column if not exists integrity_status text not null default 'DECLARED';
alter table projects add column if not exists risk_score integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'projects_integrity_status_check'
      and conrelid = 'projects'::regclass
  ) then
    alter table projects
      add constraint projects_integrity_status_check
      check (integrity_status in ('DECLARED', 'IDENTITY_VERIFIED', 'EVIDENCE_PENDING', 'EVIDENCE_VERIFIED', 'UNDER_REVIEW', 'INDEPENDENTLY_VERIFIED', 'VERIFIED', 'ON_HOLD', 'SUSPENDED', 'REVOKED', 'REJECTED'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'projects_risk_score_check'
      and conrelid = 'projects'::regclass
  ) then
    alter table projects
      add constraint projects_risk_score_check
      check (risk_score is null or (risk_score >= 0 and risk_score <= 100));
  end if;
end $$;

alter table claims enable row level security;
alter table evidence enable row level security;
alter table conflicts enable row level security;

revoke insert, update, delete on claims, evidence, conflicts from anon, authenticated;

-- Sem policy de select: Conflict revela existencia e proximidade geometrica de
-- projetos de terceiros (mesma classe de sensibilidade de project_boundaries,
-- D-GEO-01 / T-041-11). Exposicao apenas via /api/v1 com guard org-scoped.
