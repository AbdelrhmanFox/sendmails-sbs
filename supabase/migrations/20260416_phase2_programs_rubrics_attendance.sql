-- Phase 2: programs/cohorts + rubrics + attendance identity hardening

create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  program_code text not null unique,
  program_name text not null,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.program_courses (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  course_id text not null references public.courses(course_id) on delete cascade,
  sort_order int not null default 0,
  is_required boolean not null default true,
  unique (program_id, course_id)
);

create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  cohort_code text not null unique,
  cohort_name text not null,
  program_id uuid references public.programs(id) on delete set null,
  start_date date,
  end_date date,
  status text not null default 'planned',
  created_at timestamptz not null default now()
);

create table if not exists public.cohort_enrollments (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  trainee_id text not null references public.trainees(trainee_id) on delete cascade,
  enrollment_state text not null default 'active',
  joined_at timestamptz not null default now(),
  unique (cohort_id, trainee_id)
);

create table if not exists public.rubric_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid not null references public.rubric_templates(id) on delete cascade,
  criterion text not null,
  max_points numeric(8,2) not null default 1,
  weight numeric(6,3) not null default 1,
  sort_order int not null default 0
);

create table if not exists public.assignment_rubrics (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.classroom_assignments(id) on delete cascade,
  rubric_id uuid not null references public.rubric_templates(id) on delete cascade,
  unique (assignment_id, rubric_id)
);

create table if not exists public.rubric_scores (
  id uuid primary key default gen_random_uuid(),
  submission_review_id uuid not null references public.classroom_submission_reviews(id) on delete cascade,
  criterion_id uuid not null references public.rubric_criteria(id) on delete cascade,
  score numeric(8,2) not null default 0,
  feedback text,
  unique (submission_review_id, criterion_id)
);

alter table public.session_attendance
  add column if not exists trainee_id text;

alter table public.session_attendance
  add constraint if not exists session_attendance_trainee_fk
  foreign key (trainee_id) references public.trainees(trainee_id) on delete set null not valid;

alter table public.programs enable row level security;
alter table public.program_courses enable row level security;
alter table public.cohorts enable row level security;
alter table public.cohort_enrollments enable row level security;
alter table public.rubric_templates enable row level security;
alter table public.rubric_criteria enable row level security;
alter table public.assignment_rubrics enable row level security;
alter table public.rubric_scores enable row level security;

drop policy if exists programs_deny_all on public.programs;
create policy programs_deny_all on public.programs for all using (false);
drop policy if exists program_courses_deny_all on public.program_courses;
create policy program_courses_deny_all on public.program_courses for all using (false);
drop policy if exists cohorts_deny_all on public.cohorts;
create policy cohorts_deny_all on public.cohorts for all using (false);
drop policy if exists cohort_enrollments_deny_all on public.cohort_enrollments;
create policy cohort_enrollments_deny_all on public.cohort_enrollments for all using (false);
drop policy if exists rubric_templates_deny_all on public.rubric_templates;
create policy rubric_templates_deny_all on public.rubric_templates for all using (false);
drop policy if exists rubric_criteria_deny_all on public.rubric_criteria;
create policy rubric_criteria_deny_all on public.rubric_criteria for all using (false);
drop policy if exists assignment_rubrics_deny_all on public.assignment_rubrics;
create policy assignment_rubrics_deny_all on public.assignment_rubrics for all using (false);
drop policy if exists rubric_scores_deny_all on public.rubric_scores;
create policy rubric_scores_deny_all on public.rubric_scores for all using (false);

