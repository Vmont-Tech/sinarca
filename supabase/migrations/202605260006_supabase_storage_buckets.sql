-- Storage padronizado para documentos, imagens e arquivos de usuario.
-- Buckets sao raiz no Supabase Storage; pastas sao object paths.
-- projects/{project_friendly_id}/documents/{document_type}/{sha256}.{ext}
-- projects/drafts/{draft_id}/documents/{document_type}/{sha256}.{ext}
-- projects/{project_friendly_id}/images/{sha256}.{ext}
-- profiles/{profile_id}/avatar/{sha256}.{ext}
-- user-documents/{profile_id}/documents/{document_type}/{sha256}.{ext}

insert into storage.buckets (id, name, public)
values
  ('projects', 'projects', false),
  ('profiles', 'profiles', true),
  ('user-documents', 'user-documents', false)
on conflict (id) do update
set public = excluded.public;

alter table documents add column if not exists storage_bucket text not null default 'projects';
alter table documents add column if not exists storage_object_path text;

update documents
set
  storage_bucket = coalesce(nullif(storage_bucket, ''), 'projects'),
  storage_object_path = case
    when storage_object_path is not null and storage_object_path <> '' then storage_object_path
    when storage_path like 'supabase://%/%' then regexp_replace(storage_path, '^supabase://[^/]+/', '')
    else storage_path
  end;

create index if not exists documents_storage_bucket_object_path_idx
  on documents (storage_bucket, storage_object_path);

alter table project_drafts add column if not exists draft_kind text not null default 'CREATE';
alter table project_drafts add column if not exists target_project_id uuid references projects(id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'project_drafts_draft_kind_check'
  ) then
    alter table project_drafts
      add constraint project_drafts_draft_kind_check check (draft_kind in ('CREATE', 'EDIT'));
  end if;
end $$;

create index if not exists project_drafts_target_project_idx
  on project_drafts (target_project_id, status, updated_at desc);

alter table project_draft_documents add column if not exists storage_bucket text not null default 'projects';
alter table project_draft_documents add column if not exists storage_object_path text;

update project_draft_documents
set
  storage_bucket = coalesce(nullif(storage_bucket, ''), 'projects'),
  storage_object_path = case
    when storage_object_path is not null and storage_object_path <> '' then storage_object_path
    when storage_path like 'supabase://%/%' then regexp_replace(storage_path, '^supabase://[^/]+/', '')
    else storage_path
  end;

create index if not exists project_draft_documents_storage_bucket_object_path_idx
  on project_draft_documents (storage_bucket, storage_object_path);
