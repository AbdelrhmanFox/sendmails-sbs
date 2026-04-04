-- Public bucket for course library file uploads; reads are public (participant links use URLs).
-- Uploads use signed URLs from serverless (service role); direct anon uploads stay disabled.

insert into storage.buckets (id, name, public, file_size_limit)
values ('course-materials', 'course-materials', true, 52428800)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists "Public read course materials" on storage.objects;
create policy "Public read course materials"
on storage.objects for select
to public
using (bucket_id = 'course-materials');
