create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  role text not null check (role in ('admin', 'staff', 'trainer', 'user', 'accountant')),
  created_at timestamptz not null default now()
);

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  billing_email text,
  tax_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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
  company_id uuid references companies (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_trainees_company_id on trainees (company_id);

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

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  enrollment_uuid uuid not null references enrollments (id) on delete restrict,
  amount numeric(12, 2) not null,
  currency text not null default 'EGP',
  method text,
  received_at timestamptz not null default now(),
  reference text,
  status text not null default 'recorded',
  notes text,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_enrollment_uuid on payments (enrollment_uuid);
create index if not exists idx_payments_received_at on payments (received_at);
create index if not exists idx_payments_status on payments (status);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies (id) on delete set null,
  invoice_number text unique not null,
  issue_date date not null,
  due_date date,
  status text not null default 'draft',
  subtotal numeric(14, 2),
  tax_amount numeric(14, 2),
  total numeric(14, 2),
  currency text not null default 'EGP',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_invoices_company_id on invoices (company_id);
create index if not exists idx_invoices_due_date on invoices (due_date);
create index if not exists idx_invoices_status on invoices (status);

create table if not exists invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices (id) on delete cascade,
  enrollment_uuid uuid references enrollments (id) on delete set null,
  description text,
  quantity numeric(12, 4) default 1,
  unit_price numeric(12, 2),
  line_total numeric(12, 2),
  created_at timestamptz not null default now()
);

create index if not exists idx_invoice_lines_invoice_id on invoice_lines (invoice_id);

create table if not exists finance_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  entity text not null,
  entity_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_finance_audit_created_at on finance_audit_log (created_at desc);

create table if not exists training_sessions (
  id uuid primary key default gen_random_uuid(),
  trainer_username text not null,
  title text not null,
  groups_count int not null default 1 check (groups_count between 1 and 12),
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

create table if not exists training_materials (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references training_sessions (id) on delete cascade,
  group_id uuid references training_groups (id) on delete cascade,
  title text not null,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_training_materials_session_id on training_materials (session_id);
create index if not exists idx_training_materials_group_id on training_materials (group_id);

create table if not exists session_attendance (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references training_groups (id) on delete cascade,
  participant_name text not null,
  attendance_date date not null,
  status text not null default 'present',
  notes text,
  created_at timestamptz not null default now(),
  unique (group_id, participant_name, attendance_date)
);

create index if not exists idx_session_attendance_group_id on session_attendance (group_id);

alter table enrollments enable row level security;
alter table trainees enable row level security;
alter table courses enable row level security;
alter table batches enable row level security;
alter table companies enable row level security;
alter table payments enable row level security;
alter table invoices enable row level security;
alter table invoice_lines enable row level security;
alter table finance_audit_log enable row level security;
alter table training_sessions enable row level security;
alter table training_groups enable row level security;
alter table training_participants enable row level security;
alter table training_messages enable row level security;
alter table training_materials enable row level security;
alter table session_attendance enable row level security;

drop policy if exists trainees_deny_all on trainees;
create policy trainees_deny_all on trainees for all using (false);

drop policy if exists courses_deny_all on courses;
create policy courses_deny_all on courses for all using (false);

drop policy if exists batches_deny_all on batches;
create policy batches_deny_all on batches for all using (false);

drop policy if exists enrollments_deny_all on enrollments;
create policy enrollments_deny_all on enrollments for all using (false);

drop policy if exists companies_deny_all on companies;
create policy companies_deny_all on companies for all using (false);

drop policy if exists payments_deny_all on payments;
create policy payments_deny_all on payments for all using (false);

drop policy if exists invoices_deny_all on invoices;
create policy invoices_deny_all on invoices for all using (false);

drop policy if exists invoice_lines_deny_all on invoice_lines;
create policy invoice_lines_deny_all on invoice_lines for all using (false);

drop policy if exists finance_audit_log_deny_all on finance_audit_log;
create policy finance_audit_log_deny_all on finance_audit_log for all using (false);

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

drop policy if exists training_materials_deny_all on training_materials;
create policy training_materials_deny_all on training_materials for all using (false);

drop policy if exists session_attendance_deny_all on session_attendance;
create policy session_attendance_deny_all on session_attendance for all using (false);

-- Login reads app_users with the service role only; keep RLS off (if RLS was enabled in the dashboard, login can 500).
alter table public.app_users disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert on training_groups to anon, authenticated;
grant select, insert on training_participants to anon, authenticated;
grant select, insert on training_messages to anon, authenticated;
