-- Buckets usados pelo backend_app via service role. O nível raiz é o bucket;
-- os diretórios por perfil/projeto são caminhos dos objetos dentro do bucket.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profiles', 'profiles', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('user-documents', 'user-documents', false, 10485760, array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "public read profile images"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'profiles');

create policy "backend service manages profile images"
  on storage.objects for all
  to service_role
  using (bucket_id = 'profiles')
  with check (bucket_id = 'profiles');

create policy "backend service manages user documents"
  on storage.objects for all
  to service_role
  using (bucket_id = 'user-documents')
  with check (bucket_id = 'user-documents');
