-- Phase 6: Accredible parity foundation (templates, pathways, public verification analytics)

create table if not exists public.credential_templates (
  id uuid primary key default gen_random_uuid(),
  template_code text not null unique,
  template_name text not null,
  credential_type text not null default 'certificate',
  template_schema jsonb not null default '{}'::jsonb,
  brand_settings jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.certificates
  add column if not exists template_id uuid references public.credential_templates(id) on delete set null;

alter table public.certificates
  add column if not exists learner_slug text;

alter table public.certificates
  add column if not exists shared_at timestamptz;

alter table public.certificates
  add column if not exists revoked_at timestamptz;

create index if not exists idx_certificates_verification_token on public.certificates(verification_token);
create index if not exists idx_certificates_learner_slug on public.certificates(learner_slug);
create index if not exists idx_certificates_template_id on public.certificates(template_id);

create table if not exists public.credential_events (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete cascade,
  event_type text not null,
  event_actor text,
  event_channel text,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_credential_events_cert on public.credential_events(certificate_id, created_at desc);
create index if not exists idx_credential_events_type on public.credential_events(event_type);

create table if not exists public.verification_logs (
  id uuid primary key default gen_random_uuid(),
  certificate_id uuid not null references public.certificates(id) on delete cascade,
  verification_token uuid not null,
  source text not null default 'public_page',
  ip_hash text,
  user_agent text,
  verified_at timestamptz not null default now()
);

create index if not exists idx_verification_logs_cert on public.verification_logs(certificate_id, verified_at desc);

create table if not exists public.learner_profiles (
  id uuid primary key default gen_random_uuid(),
  trainee_id text not null references public.trainees(trainee_id) on delete cascade,
  profile_slug text not null unique,
  display_name text,
  headline text,
  bio text,
  social_links jsonb not null default '{}'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_learner_profiles_trainee on public.learner_profiles(trainee_id);

create table if not exists public.pathways (
  id uuid primary key default gen_random_uuid(),
  pathway_code text not null unique,
  pathway_name text not null,
  description text,
  status text not null default 'active',
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.pathway_steps (
  id uuid primary key default gen_random_uuid(),
  pathway_id uuid not null references public.pathways(id) on delete cascade,
  course_id text references public.courses(course_id) on delete set null,
  step_name text not null,
  step_order int not null default 0,
  is_required boolean not null default true,
  unique (pathway_id, step_order)
);

create table if not exists public.pathway_enrollments (
  id uuid primary key default gen_random_uuid(),
  pathway_id uuid not null references public.pathways(id) on delete cascade,
  trainee_id text not null references public.trainees(trainee_id) on delete cascade,
  progress_pct numeric(5,2) not null default 0,
  completion_state text not null default 'in_progress',
  completed_at timestamptz,
  unique (pathway_id, trainee_id)
);

create index if not exists idx_pathway_enrollments_trainee on public.pathway_enrollments(trainee_id);

create table if not exists public.spotlight_profiles (
  id uuid primary key default gen_random_uuid(),
  learner_profile_id uuid not null references public.learner_profiles(id) on delete cascade,
  feature_rank int not null default 0,
  is_featured boolean not null default false,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  unique (learner_profile_id)
);

create view public.mv_credential_funnel as
select
  date_trunc('day', c.issued_at) as day,
  count(*) as issued_count,
  count(*) filter (where c.shared_at is not null) as shared_count,
  count(distinct vl.certificate_id) as verified_count
from public.certificates c
left join public.verification_logs vl on vl.certificate_id = c.id
group by 1;

alter table public.credential_templates enable row level security;
alter table public.credential_events enable row level security;
alter table public.verification_logs enable row level security;
alter table public.learner_profiles enable row level security;
alter table public.pathways enable row level security;
alter table public.pathway_steps enable row level security;
alter table public.pathway_enrollments enable row level security;
alter table public.spotlight_profiles enable row level security;

drop policy if exists credential_templates_deny_all on public.credential_templates;
create policy credential_templates_deny_all on public.credential_templates for all using (false);
drop policy if exists credential_events_deny_all on public.credential_events;
create policy credential_events_deny_all on public.credential_events for all using (false);
drop policy if exists verification_logs_deny_all on public.verification_logs;
create policy verification_logs_deny_all on public.verification_logs for all using (false);
drop policy if exists learner_profiles_deny_all on public.learner_profiles;
create policy learner_profiles_deny_all on public.learner_profiles for all using (false);
drop policy if exists pathways_deny_all on public.pathways;
create policy pathways_deny_all on public.pathways for all using (false);
drop policy if exists pathway_steps_deny_all on public.pathway_steps;
create policy pathway_steps_deny_all on public.pathway_steps for all using (false);
drop policy if exists pathway_enrollments_deny_all on public.pathway_enrollments;
create policy pathway_enrollments_deny_all on public.pathway_enrollments for all using (false);
drop policy if exists spotlight_profiles_deny_all on public.spotlight_profiles;
create policy spotlight_profiles_deny_all on public.spotlight_profiles for all using (false);
