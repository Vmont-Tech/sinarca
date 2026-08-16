-- Phase 04.1: project_boundaries e ADITIVA. project_tags permanece intacta como
-- tabela de identidade fisica do QTAG/NFC (D-GEO: CONTEXT.md 04.1). A geometria
-- geoespacial vive aqui, separada.
--
-- D-GEO-01 (RLS): tabela operacional interna. RLS habilitado, DML revogado de
-- anon/authenticated e SEM policy de select, exatamente como
-- certification_pendencies/treasury_authorizations (202608150001). A geometria
-- chega ao cliente apenas via backend_app, serializada como GeoJSON pelos
-- endpoints de dossie/review, preservando a minimizacao de resposta (D-20/D-22).
--
-- D-GEO-03 (active_boundary): espelha declared_boundary por codigo de aplicacao
-- e por esta migration de backfill; nunca por trigger (o repo nao usa triggers).
-- Prioridade CERTIFIED > FIELD_VERIFIED > DECLARED; nesta fase so DECLARED e
-- populada, entao active_boundary_tier e sempre 'DECLARED'.

create table if not exists project_boundaries (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references projects(id) on delete cascade,

  declared_boundary geometry(Polygon, 4326),
  declared_area_ha numeric(14, 4),
  declared_source text,
  declared_vertex_count integer,
  declared_area_divergence_pct numeric(10, 4),
  declared_area_divergence_flagged boolean not null default false,

  field_verified_boundary geometry(Polygon, 4326),
  field_verified_area_ha numeric(14, 4),
  field_verified_source text,
  field_verified_at timestamptz,

  certified_boundary geometry(Polygon, 4326),
  certified_area_ha numeric(14, 4),
  certified_source text,
  certified_at timestamptz,

  active_boundary geometry(Polygon, 4326),
  active_boundary_tier text not null default 'DECLARED'
    check (active_boundary_tier in ('DECLARED', 'FIELD_VERIFIED', 'CERTIFIED')),

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists project_boundaries_project_id_idx
  on project_boundaries (project_id);

-- Indice GiST: ST_Intersects da deteccao de overlap (GEOF-04) depende dele para
-- usar o pre-filtro de bounding box em vez de varredura completa.
create index if not exists project_boundaries_active_boundary_gix
  on project_boundaries using gist (active_boundary);

alter table project_boundaries enable row level security;

revoke insert, update, delete on project_boundaries from anon, authenticated;

-- Sem policy de select: ver D-GEO-01 no cabecalho.
