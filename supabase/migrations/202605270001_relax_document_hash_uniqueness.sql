-- O mesmo arquivo pode ser reenviado/reaproveitado em projetos ou rascunhos
-- diferentes. A deduplicacao por hash deve ser local ao projeto/rascunho.

drop index if exists documents_sha256_hash_idx;

create index if not exists documents_sha256_hash_idx
  on documents (sha256_hash);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_project_sha256_key'
      and conrelid = 'documents'::regclass
  ) then
    alter table documents
      add constraint documents_project_sha256_key unique (project_id, sha256_hash);
  end if;
end $$;

drop index if exists project_draft_documents_sha256_hash_idx;

create index if not exists project_draft_documents_sha256_hash_idx
  on project_draft_documents (sha256_hash);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'project_draft_documents_draft_sha256_key'
      and conrelid = 'project_draft_documents'::regclass
  ) then
    alter table project_draft_documents
      add constraint project_draft_documents_draft_sha256_key unique (draft_id, sha256_hash);
  end if;
end $$;
