-- Course-scoped library: chapters and materials (reused across batches of the same course).
-- RLS deny-all; access via service role in Netlify functions only.

create table if not exists public.course_chapters (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (course_id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_course_chapters_course_id on public.course_chapters (course_id);

create table if not exists public.course_materials (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses (course_id) on delete cascade,
  chapter_id uuid references public.course_chapters (id) on delete set null,
  title text not null,
  url text not null,
  description text,
  sort_order int not null default 0,
  storage_object_key text,
  created_at timestamptz not null default now()
);

create index if not exists idx_course_materials_course_id on public.course_materials (course_id);
create index if not exists idx_course_materials_chapter_id on public.course_materials (chapter_id);

alter table public.course_chapters enable row level security;
alter table public.course_materials enable row level security;

drop policy if exists course_chapters_deny_all on public.course_chapters;
create policy course_chapters_deny_all on public.course_chapters for all using (false);

drop policy if exists course_materials_deny_all on public.course_materials;
create policy course_materials_deny_all on public.course_materials for all using (false);
