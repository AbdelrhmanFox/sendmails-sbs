-- Trainee auth accounts for student portal login.
-- Uses service-role access only (RLS deny-all pattern).

create table if not exists public.trainee_users (
  id uuid primary key default gen_random_uuid(),
  trainee_id text not null references public.trainees (trainee_id) on delete cascade,
  email text not null,
  password_hash text not null,
  must_change_password boolean not null default true,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trainee_id)
);

create unique index if not exists uq_trainee_users_email_lower
  on public.trainee_users ((lower(email)));

create index if not exists idx_trainee_users_trainee_id
  on public.trainee_users (trainee_id);

alter table public.trainee_users enable row level security;
drop policy if exists trainee_users_deny_all on public.trainee_users;
create policy trainee_users_deny_all on public.trainee_users for all using (false);

-- Backfill accounts for existing trainees with email.
-- Temporary password pattern: SBS-<last6digits>-Temp (must change on first login).
with src as (
  select
    t.trainee_id,
    lower(btrim(t.email)) as email,
    right(regexp_replace(coalesce(t.trainee_id, ''), '[^0-9]', '', 'g'), 6) as id_tail
  from public.trainees t
  where btrim(coalesce(t.email, '')) <> ''
),
dedup as (
  select distinct on (email) trainee_id, email, id_tail
  from src
  order by email, trainee_id
)
insert into public.trainee_users (trainee_id, email, password_hash, must_change_password, is_active)
select
  d.trainee_id,
  d.email,
  crypt('SBS-' || lpad(coalesce(nullif(d.id_tail, ''), '000000'), 6, '0') || '-Temp', gen_salt('bf', 10)),
  true,
  true
from dedup d
on conflict do nothing;
