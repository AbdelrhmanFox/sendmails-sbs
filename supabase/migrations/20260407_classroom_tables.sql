-- Trainer Classroom: assignments, per-trainee grades, batch materials (Google Classroom–style).
-- Apply after batches/trainees/enrollments exist.

create table if not exists public.classroom_assignments (
  id uuid primary key default gen_random_uuid(),
  batch_id text not null references public.batches (batch_id) on delete cascade,
  title text not null,
  instructions text,
  due_date date,
  created_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_classroom_assignments_batch_id on public.classroom_assignments (batch_id);

create table if not exists public.classroom_grades (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.classroom_assignments (id) on delete cascade,
  trainee_id text not null references public.trainees (trainee_id) on delete cascade,
  grade numeric(5, 2),
  feedback text,
  graded_by text not null,
  graded_at timestamptz not null default now(),
  unique (assignment_id, trainee_id)
);

create index if not exists idx_classroom_grades_assignment_id on public.classroom_grades (assignment_id);

create table if not exists public.classroom_materials (
  id uuid primary key default gen_random_uuid(),
  batch_id text not null references public.batches (batch_id) on delete cascade,
  title text not null,
  url text,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_classroom_materials_batch_id on public.classroom_materials (batch_id);

alter table public.classroom_assignments enable row level security;
alter table public.classroom_grades enable row level security;
alter table public.classroom_materials enable row level security;

drop policy if exists classroom_assignments_deny_all on public.classroom_assignments;
create policy classroom_assignments_deny_all on public.classroom_assignments for all using (false);

drop policy if exists classroom_grades_deny_all on public.classroom_grades;
create policy classroom_grades_deny_all on public.classroom_grades for all using (false);

drop policy if exists classroom_materials_deny_all on public.classroom_materials;
create policy classroom_materials_deny_all on public.classroom_materials for all using (false);
