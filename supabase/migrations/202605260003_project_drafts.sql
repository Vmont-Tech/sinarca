create table project_drafts (
  id uuid primary key default uuid_generate_v4(),
  owner_profile_id uuid references profiles(id),
  producer_organization_id uuid references organizations(id),
  draft_kind text not null default 'CREATE' check (draft_kind in ('CREATE', 'EDIT')),
  target_project_id uuid references projects(id),
  current_step text not null default 'project',
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SUBMITTED', 'DISCARDED')),
  payload jsonb not null default '{}'::jsonb,
  submitted_project_id uuid references projects(id),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index project_drafts_owner_status_idx
  on project_drafts (owner_profile_id, status, updated_at desc);

create index project_drafts_producer_status_idx
  on project_drafts (producer_organization_id, status, updated_at desc);

create index project_drafts_target_project_idx
  on project_drafts (target_project_id, status, updated_at desc);

create table project_draft_documents (
  id uuid primary key default uuid_generate_v4(),
  draft_id uuid not null references project_drafts(id) on delete cascade,
  owner_profile_id uuid references profiles(id),
  document_type text not null,
  storage_bucket text not null default 'projects',
  storage_object_path text,
  storage_path text not null,
  sha256_hash text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create unique index project_draft_documents_sha256_hash_idx
  on project_draft_documents (sha256_hash);

create index project_draft_documents_draft_idx
  on project_draft_documents (draft_id, document_type);

create index project_draft_documents_storage_bucket_object_path_idx
  on project_draft_documents (storage_bucket, storage_object_path);

alter table project_drafts enable row level security;
alter table project_draft_documents enable row level security;

revoke insert, update, delete on project_drafts, project_draft_documents
  from anon, authenticated;

-- Sem politicas diretas: rascunhos e arquivos pre-projeto sao privados e
-- manipulados apenas pelo backend com auth propria e conexao de aplicacao.
