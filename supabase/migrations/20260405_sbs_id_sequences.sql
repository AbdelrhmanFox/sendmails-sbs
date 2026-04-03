-- SBS human-readable business IDs (server-side sequences) + required trainee contact fields.
-- Run after baseline schema. For existing rows with NULL phone/email, backfill before NOT NULL.

update public.trainees
set phone = coalesce(nullif(trim(phone), ''), '0000000000')
where phone is null or trim(phone) = '';

update public.trainees
set email = coalesce(nullif(trim(email), ''), 'pending-update@sbs.local')
where email is null or trim(email) = '';

alter table public.trainees
  alter column phone set not null,
  alter column email set not null;

create sequence if not exists public.trainees_seq;
create sequence if not exists public.courses_seq;
create sequence if not exists public.enrollments_seq;

create table if not exists public.batch_counters (
  course_id text primary key,
  last_nn int not null default 0
);

-- Seed sequences from existing business keys (SBS-* and legacy TR-/CR-/EN- styles).
select setval(
  'public.trainees_seq',
  greatest(
    coalesce(
      (select max((regexp_match(trainee_id, '^SBS-TR-([0-9]+)$'))[1]::int) from public.trainees where trainee_id ~ '^SBS-TR-[0-9]+$'),
      0
    ),
    coalesce(
      (select max((regexp_match(trainee_id, '^TR-([0-9]+)$'))[1]::int) from public.trainees where trainee_id ~ '^TR-[0-9]+$'),
      0
    )
  ),
  true
);

select setval(
  'public.courses_seq',
  greatest(
    coalesce(
      (select max((regexp_match(course_id, '^SBS-CO-([0-9]+)$'))[1]::int) from public.courses where course_id ~ '^SBS-CO-[0-9]+$'),
      0
    ),
    coalesce(
      (select max((regexp_match(course_id, '^CR-([0-9]+)$'))[1]::int) from public.courses where course_id ~ '^CR-[0-9]+$'),
      0
    )
  ),
  true
);

select setval(
  'public.enrollments_seq',
  greatest(
    coalesce(
      (select max((regexp_match(enrollment_id, '^SBS-EN-([0-9]+)$'))[1]::int) from public.enrollments where enrollment_id ~ '^SBS-EN-[0-9]+$'),
      0
    ),
    coalesce(
      (select max((regexp_match(enrollment_id, '^EN-([0-9]+)$'))[1]::int) from public.enrollments where enrollment_id ~ '^EN-[0-9]+$'),
      0
    )
  ),
  true
);

create or replace function public.next_trainee_id() returns text
language sql
set search_path = public
as $$
  select 'SBS-TR-' || lpad(nextval('public.trainees_seq')::text, 6, '0');
$$;

create or replace function public.next_course_id() returns text
language sql
set search_path = public
as $$
  select 'SBS-CO-' || lpad(nextval('public.courses_seq')::text, 6, '0');
$$;

create or replace function public.next_enrollment_id() returns text
language sql
set search_path = public
as $$
  select 'SBS-EN-' || lpad(nextval('public.enrollments_seq')::text, 6, '0');
$$;

create or replace function public.next_batch_id(p_course_id text) returns text
language plpgsql
set search_path = public
as $$
declare
  nn int;
  cid text := trim(p_course_id);
begin
  if cid = '' then
    raise exception 'course_id required for batch id';
  end if;
  insert into public.batch_counters(course_id, last_nn) values (cid, 1)
    on conflict (course_id) do update set last_nn = public.batch_counters.last_nn + 1
    returning last_nn into nn;
  return 'SBS-BA-' || cid || '-' || lpad(nn::text, 2, '0');
end;
$$;

-- Seed batch_counters from existing SBS-BA-* rows (last numeric segment = per-course counter).
insert into public.batch_counters(course_id, last_nn)
select b.course_id,
  max(cast((string_to_array(b.batch_id, '-'))[array_length(string_to_array(b.batch_id, '-'), 1)] as integer)) as nn
from public.batches b
where b.batch_id like 'SBS-BA-%'
  and b.course_id is not null
  and trim(b.course_id) <> ''
  and (string_to_array(b.batch_id, '-'))[array_length(string_to_array(b.batch_id, '-'), 1)] ~ '^[0-9]+$'
group by b.course_id
on conflict (course_id) do update
set last_nn = greatest(public.batch_counters.last_nn, excluded.last_nn);

comment on function public.next_trainee_id is 'Returns next SBS-TR-###### business id.';
comment on function public.next_course_id is 'Returns next SBS-CO-###### business id.';
comment on function public.next_enrollment_id is 'Returns next SBS-EN-###### business id.';
comment on function public.next_batch_id(text) is 'Returns SBS-BA-{course_id}-NN per course counter.';
