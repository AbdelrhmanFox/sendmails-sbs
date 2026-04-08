-- Batch classroom materials: optional uploaded file (public bucket) in addition to external links.

alter table public.classroom_materials
  add column if not exists storage_object_key text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint;

insert into storage.buckets (id, name, public, file_size_limit)
values ('classroom-material-files', 'classroom-material-files', true, 104857600)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists "Public read classroom material files" on storage.objects;
create policy "Public read classroom material files"
on storage.objects for select
to public
using (bucket_id = 'classroom-material-files');
