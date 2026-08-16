-- Phase 04.2 / INTG-04: Risk Engine append-only (D-19).
-- Uma linha nova de risk_assessments por recalculo (mesmo padrao de
-- certifications); "risco atual" e sempre a ultima linha por created_at.
-- risk_signals carrega a explicabilidade obrigatoria (D-15 / Bible secao 42).

create table if not exists risk_assessments (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id),
  risk_score integer not null check (risk_score >= 0 and risk_score <= 100),
  risk_class text not null check (risk_class in ('LOW', 'MODERATE', 'HIGH', 'VERY_HIGH', 'CRITICAL')),
  integrity_status text not null check (integrity_status in ('DECLARED', 'IDENTITY_VERIFIED', 'EVIDENCE_PENDING', 'EVIDENCE_VERIFIED', 'UNDER_REVIEW', 'INDEPENDENTLY_VERIFIED', 'VERIFIED', 'ON_HOLD', 'SUSPENDED', 'REVOKED', 'REJECTED')),
  auto_hold boolean not null default false,
  trigger text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists risk_assessments_project_created_idx
  on risk_assessments (project_id, created_at desc);

create table if not exists risk_signals (
  id uuid primary key default uuid_generate_v4(),
  risk_assessment_id uuid not null references risk_assessments(id) on delete cascade,
  code text not null,
  weight numeric(6, 2) not null,
  reason text not null,
  public_safe boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists risk_signals_assessment_idx on risk_signals (risk_assessment_id, created_at);

alter table risk_assessments enable row level security;
alter table risk_signals enable row level security;

revoke insert, update, delete on risk_assessments, risk_signals from anon, authenticated;

-- Sem policy de select: score e sinais internos so saem por /api/v1 (visao
-- interna org-scoped) ou pelo dossie publico ja minimizado.
