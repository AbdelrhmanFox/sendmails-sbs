create table if not exists public.classroom_material_chapters (
  id uuid primary key default gen_random_uuid(),
  batch_id text not null references public.batches (batch_id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_classroom_material_chapters_batch_id
  on public.classroom_material_chapters (batch_id);

alter table public.classroom_materials
  add column if not exists chapter_id uuid references public.classroom_material_chapters (id) on delete set null;

create index if not exists idx_classroom_materials_chapter_id
  on public.classroom_materials (chapter_id);

alter table public.classroom_material_chapters enable row level security;

drop policy if exists classroom_material_chapters_deny_all on public.classroom_material_chapters;
create policy classroom_material_chapters_deny_all on public.classroom_material_chapters for all using (false);
