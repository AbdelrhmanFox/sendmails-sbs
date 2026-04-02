create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  role text not null check (role in ('admin', 'staff', 'trainer', 'user')),
  created_at timestamptz not null default now()
);

create table if not exists trainees (
  id uuid primary key default gen_random_uuid(),
  trainee_id text unique not null,
  full_name text,
  email text,
  phone text,
  trainee_type text,
  company_name text,
  job_title text,
  university text,
  specialty text,
  city text,
  created_date date,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  course_id text unique not null,
  course_name text not null,
  category text,
  target_audience text,
  duration_hours numeric(10,2),
  delivery_type text check (delivery_type in ('Online', 'Offline', 'Hybrid')),
  price numeric(12,2),
  description text,
  status text check (status in ('Active', 'Archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists batches (
  id uuid primary key default gen_random_uuid(),
  batch_id text unique not null,
  course_id text,
  batch_name text,
  trainer text,
  location text,
  capacity int,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  enrollment_id text unique not null,
  trainee_id text not null,
  batch_id text not null,
  enrollment_status text not null check (enrollment_status in ('Registered', 'Attended', 'Cancelled', 'Completed')),
  payment_status text not null check (payment_status in ('Pending', 'Paid', 'Waived')),
  amount_paid numeric(12,2),
  certificate_issued boolean,
  enroll_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_enrollments_trainee_id on enrollments (trainee_id);
create index if not exists idx_enrollments_batch_id on enrollments (batch_id);
create index if not exists idx_enrollments_enroll_date on enrollments (enroll_date);

create table if not exists training_sessions (
  id uuid primary key default gen_random_uuid(),
  trainer_username text not null,
  title text not null,
  groups_count int not null default 4 check (groups_count between 2 and 12),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists training_groups (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references training_sessions(id) on delete cascade,
  group_number int not null check (group_number > 0),
  join_token uuid not null unique default gen_random_uuid(),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  unique (session_id, group_number)
);

create table if not exists training_participants (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references training_groups(id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now()
);

create table if not exists training_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references training_groups(id) on delete cascade,
  participant_id uuid references training_participants(id) on delete set null,
  sender_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_training_messages_group_id_created_at on training_messages (group_id, created_at);

alter table enrollments enable row level security;
alter table trainees enable row level security;
alter table courses enable row level security;
alter table batches enable row level security;
alter table training_sessions enable row level security;
alter table training_groups enable row level security;
alter table training_participants enable row level security;
alter table training_messages enable row level security;

drop policy if exists trainees_deny_all on trainees;
create policy trainees_deny_all on trainees for all using (false);

drop policy if exists courses_deny_all on courses;
create policy courses_deny_all on courses for all using (false);

drop policy if exists batches_deny_all on batches;
create policy batches_deny_all on batches for all using (false);

drop policy if exists enrollments_deny_all on enrollments;
create policy enrollments_deny_all on enrollments for all using (false);

drop policy if exists training_sessions_deny_all on training_sessions;
create policy training_sessions_deny_all on training_sessions for all using (false);

drop policy if exists training_groups_public_read on training_groups;
create policy training_groups_public_read on training_groups
  for select
  using (is_public = true);

drop policy if exists training_participants_public_rw on training_participants;
create policy training_participants_public_rw on training_participants
  for all
  using (
    exists (
      select 1
      from training_groups g
      where g.id = training_participants.group_id
        and g.is_public = true
    )
  )
  with check (
    exists (
      select 1
      from training_groups g
      where g.id = training_participants.group_id
        and g.is_public = true
    )
  );

drop policy if exists training_messages_public_rw on training_messages;
create policy training_messages_public_rw on training_messages
  for all
  using (
    exists (
      select 1
      from training_groups g
      where g.id = training_messages.group_id
        and g.is_public = true
    )
  )
  with check (
    exists (
      select 1
      from training_groups g
      where g.id = training_messages.group_id
        and g.is_public = true
    )
  );

grant usage on schema public to anon, authenticated;
grant select, insert on training_groups to anon, authenticated;
grant select, insert on training_participants to anon, authenticated;
grant select, insert on training_messages to anon, authenticated;
