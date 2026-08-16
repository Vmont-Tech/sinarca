-- O mesmo arquivo pode cumprir papeis documentais diferentes no mesmo
-- projeto/rascunho. A idempotencia deve valer para o mesmo tipo documental,
-- nao para qualquer reenquadramento do mesmo hash.

alter table documents
  drop constraint if exists documents_project_sha256_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_project_type_sha256_key'
      and conrelid = 'documents'::regclass
  ) then
    alter table documents
      add constraint documents_project_type_sha256_key unique (project_id, document_type, sha256_hash);
  end if;
end $$;

alter table project_draft_documents
  drop constraint if exists project_draft_documents_draft_sha256_key;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'project_draft_documents_draft_type_sha256_key'
      and conrelid = 'project_draft_documents'::regclass
  ) then
    alter table project_draft_documents
      add constraint project_draft_documents_draft_type_sha256_key unique (draft_id, document_type, sha256_hash);
  end if;
end $$;
