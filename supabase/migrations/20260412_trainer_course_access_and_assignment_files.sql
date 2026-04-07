-- Trainer course access mapping + assignment attachments storage.

create table if not exists public.trainer_course_access (
  id uuid primary key default gen_random_uuid(),
  trainer_username text not null,
  course_id text not null references public.courses (course_id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (trainer_username, course_id)
);

create index if not exists idx_trainer_course_access_trainer on public.trainer_course_access (trainer_username);
create index if not exists idx_trainer_course_access_course on public.trainer_course_access (course_id);

create table if not exists public.classroom_assignment_files (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.classroom_assignments (id) on delete cascade,
  title text,
  file_url text not null,
  file_storage_key text not null,
  mime_type text,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists idx_classroom_assignment_files_assignment on public.classroom_assignment_files (assignment_id);

alter table public.trainer_course_access enable row level security;
alter table public.classroom_assignment_files enable row level security;

drop policy if exists trainer_course_access_deny_all on public.trainer_course_access;
create policy trainer_course_access_deny_all on public.trainer_course_access for all using (false);

drop policy if exists classroom_assignment_files_deny_all on public.classroom_assignment_files;
create policy classroom_assignment_files_deny_all on public.classroom_assignment_files for all using (false);

insert into storage.buckets (id, name, public, file_size_limit)
values ('classroom-assignment-files', 'classroom-assignment-files', true, 104857600)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists "Public read classroom assignment files" on storage.objects;
create policy "Public read classroom assignment files"
on storage.objects for select
to public
using (bucket_id = 'classroom-assignment-files');
