-- Classroom assignment submissions: trainee upload+text, trainer review.

create table if not exists public.classroom_assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.classroom_assignments (id) on delete cascade,
  trainee_name text not null,
  trainee_email text,
  submission_text text,
  file_url text,
  file_storage_key text,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed')),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_classroom_assignment_submissions_assignment_id
  on public.classroom_assignment_submissions (assignment_id);

create unique index if not exists uq_classroom_assignment_submissions_assignment_email
  on public.classroom_assignment_submissions (assignment_id, trainee_email)
  where trainee_email is not null and btrim(trainee_email) <> '';

create table if not exists public.classroom_submission_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.classroom_assignment_submissions (id) on delete cascade,
  grade numeric(5, 2),
  feedback text,
  reviewed_by text not null,
  reviewed_at timestamptz not null default now(),
  unique (submission_id)
);

create index if not exists idx_classroom_submission_reviews_submission_id
  on public.classroom_submission_reviews (submission_id);

alter table public.classroom_assignment_submissions enable row level security;
alter table public.classroom_submission_reviews enable row level security;

drop policy if exists classroom_assignment_submissions_deny_all on public.classroom_assignment_submissions;
create policy classroom_assignment_submissions_deny_all on public.classroom_assignment_submissions for all using (false);

drop policy if exists classroom_submission_reviews_deny_all on public.classroom_submission_reviews;
create policy classroom_submission_reviews_deny_all on public.classroom_submission_reviews for all using (false);

insert into storage.buckets (id, name, public, file_size_limit)
values ('classroom-submissions', 'classroom-submissions', true, 104857600)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

drop policy if exists "Public read classroom submissions" on storage.objects;
create policy "Public read classroom submissions"
on storage.objects for select
to public
using (bucket_id = 'classroom-submissions');
