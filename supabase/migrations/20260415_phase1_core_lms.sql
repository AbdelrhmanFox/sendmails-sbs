-- Phase 1: assessment + progress + certificates

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  batch_id text references public.batches(batch_id) on delete cascade,
  course_id text references public.courses(course_id) on delete set null,
  title text not null,
  description text,
  assessment_type text not null default 'quiz',
  max_score numeric(8,2),
  pass_score numeric(8,2),
  status text not null default 'draft',
  due_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_assessments_batch_id on public.assessments(batch_id);
create index if not exists idx_assessments_course_id on public.assessments(course_id);

create table if not exists public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  question_type text not null default 'mcq',
  prompt text not null,
  options jsonb,
  correct_answer jsonb,
  points numeric(8,2) not null default 1,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_assessment_questions_assessment on public.assessment_questions(assessment_id);

create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  trainee_id text not null references public.trainees(trainee_id) on delete cascade,
  attempt_no int not null default 1,
  status text not null default 'in_progress',
  answers jsonb,
  score numeric(8,2),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_by text,
  reviewed_at timestamptz,
  unique (assessment_id, trainee_id, attempt_no)
);

create index if not exists idx_assessment_attempts_assessment on public.assessment_attempts(assessment_id);
create index if not exists idx_assessment_attempts_trainee on public.assessment_attempts(trainee_id);

create table if not exists public.learner_course_progress (
  id uuid primary key default gen_random_uuid(),
  trainee_id text not null references public.trainees(trainee_id) on delete cascade,
  course_id text not null references public.courses(course_id) on delete cascade,
  batch_id text references public.batches(batch_id) on delete set null,
  progress_pct numeric(5,2) not null default 0,
  status text not null default 'not_started',
  completed_at timestamptz,
  last_activity_at timestamptz,
  unique (trainee_id, course_id, batch_id)
);

create index if not exists idx_learner_course_progress_course on public.learner_course_progress(course_id);
create index if not exists idx_learner_course_progress_trainee on public.learner_course_progress(trainee_id);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  trainee_id text not null references public.trainees(trainee_id) on delete cascade,
  course_id text not null references public.courses(course_id) on delete cascade,
  batch_id text references public.batches(batch_id) on delete set null,
  certificate_no text not null unique,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'active',
  issued_by text,
  verification_token uuid not null default gen_random_uuid(),
  metadata jsonb
);

create index if not exists idx_certificates_trainee on public.certificates(trainee_id);
create index if not exists idx_certificates_course on public.certificates(course_id);

create table if not exists public.transcript_entries (
  id uuid primary key default gen_random_uuid(),
  trainee_id text not null references public.trainees(trainee_id) on delete cascade,
  course_id text not null references public.courses(course_id) on delete cascade,
  batch_id text references public.batches(batch_id) on delete set null,
  completion_status text not null default 'in_progress',
  final_score numeric(8,2),
  completed_at timestamptz,
  certificate_id uuid references public.certificates(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_transcript_entries_trainee on public.transcript_entries(trainee_id);

alter table public.assessments enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.learner_course_progress enable row level security;
alter table public.certificates enable row level security;
alter table public.transcript_entries enable row level security;

drop policy if exists assessments_deny_all on public.assessments;
create policy assessments_deny_all on public.assessments for all using (false);
drop policy if exists assessment_questions_deny_all on public.assessment_questions;
create policy assessment_questions_deny_all on public.assessment_questions for all using (false);
drop policy if exists assessment_attempts_deny_all on public.assessment_attempts;
create policy assessment_attempts_deny_all on public.assessment_attempts for all using (false);
drop policy if exists learner_course_progress_deny_all on public.learner_course_progress;
create policy learner_course_progress_deny_all on public.learner_course_progress for all using (false);
drop policy if exists certificates_deny_all on public.certificates;
create policy certificates_deny_all on public.certificates for all using (false);
drop policy if exists transcript_entries_deny_all on public.transcript_entries;
create policy transcript_entries_deny_all on public.transcript_entries for all using (false);

