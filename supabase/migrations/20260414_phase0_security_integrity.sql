-- Phase 0: security + integrity baseline

create table if not exists public.lms_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_username text,
  actor_role text,
  action text not null,
  entity text not null,
  ref_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_lms_audit_events_created_at on public.lms_audit_events (created_at desc);
create index if not exists idx_lms_audit_events_entity on public.lms_audit_events (entity);
create index if not exists idx_lms_audit_events_actor on public.lms_audit_events (actor_username);

alter table public.lms_audit_events enable row level security;
drop policy if exists lms_audit_events_deny_all on public.lms_audit_events;
create policy lms_audit_events_deny_all on public.lms_audit_events for all using (false);

-- Add referential integrity gradually (NOT VALID avoids immediate failure on old bad rows)
alter table public.batches
  add constraint if not exists batches_course_id_fk
  foreign key (course_id) references public.courses(course_id) on update cascade on delete set null not valid;

alter table public.enrollments
  add constraint if not exists enrollments_batch_id_fk
  foreign key (batch_id) references public.batches(batch_id) on update cascade on delete set null not valid;

alter table public.enrollments
  add constraint if not exists enrollments_trainee_id_fk
  foreign key (trainee_id) references public.trainees(trainee_id) on update cascade on delete set null not valid;

