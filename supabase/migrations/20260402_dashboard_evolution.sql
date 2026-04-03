-- Migration: dashboard evolution (accountant role, finance B2B, training tools).
-- Run after existing schema.sql if the database was created from an older snapshot.

-- Role: accountant
alter table public.app_users drop constraint if exists app_users_role_check;
alter table public.app_users
  add constraint app_users_role_check
  check (role in ('admin', 'staff', 'trainer', 'user', 'accountant'));

-- Companies (B2B)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  billing_email text,
  tax_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trainees add column if not exists company_id uuid references public.companies (id) on delete set null;

create index if not exists idx_trainees_company_id on public.trainees (company_id);

-- Payments (cash ledger; enrollment internal id)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  enrollment_uuid uuid not null references public.enrollments (id) on delete restrict,
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

create index if not exists idx_payments_enrollment_uuid on public.payments (enrollment_uuid);
create index if not exists idx_payments_received_at on public.payments (received_at);
create index if not exists idx_payments_status on public.payments (status);

-- Invoices (B2B)
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete set null,
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

create index if not exists idx_invoices_company_id on public.invoices (company_id);
create index if not exists idx_invoices_due_date on public.invoices (due_date);
create index if not exists idx_invoices_status on public.invoices (status);

create table if not exists public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  enrollment_uuid uuid references public.enrollments (id) on delete set null,
  description text,
  quantity numeric(12, 4) default 1,
  unit_price numeric(12, 2),
  line_total numeric(12, 2),
  created_at timestamptz not null default now()
);

create index if not exists idx_invoice_lines_invoice_id on public.invoice_lines (invoice_id);

create table if not exists public.finance_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  entity text not null,
  entity_id text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_finance_audit_created_at on public.finance_audit_log (created_at desc);

-- Training extensions
create table if not exists public.training_materials (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.training_sessions (id) on delete cascade,
  group_id uuid references public.training_groups (id) on delete cascade,
  title text not null,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_training_materials_session_id on public.training_materials (session_id);
create index if not exists idx_training_materials_group_id on public.training_materials (group_id);

create table if not exists public.session_attendance (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.training_groups (id) on delete cascade,
  participant_name text not null,
  attendance_date date not null,
  status text not null default 'present',
  notes text,
  created_at timestamptz not null default now(),
  unique (group_id, participant_name, attendance_date)
);

create index if not exists idx_session_attendance_group_id on public.session_attendance (group_id);

-- RLS deny-all (service role bypasses RLS)
alter table public.companies enable row level security;
alter table public.payments enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.finance_audit_log enable row level security;
alter table public.training_materials enable row level security;
alter table public.session_attendance enable row level security;

drop policy if exists companies_deny_all on public.companies;
create policy companies_deny_all on public.companies for all using (false);

drop policy if exists payments_deny_all on public.payments;
create policy payments_deny_all on public.payments for all using (false);

drop policy if exists invoices_deny_all on public.invoices;
create policy invoices_deny_all on public.invoices for all using (false);

drop policy if exists invoice_lines_deny_all on public.invoice_lines;
create policy invoice_lines_deny_all on public.invoice_lines for all using (false);

drop policy if exists finance_audit_log_deny_all on public.finance_audit_log;
create policy finance_audit_log_deny_all on public.finance_audit_log for all using (false);

drop policy if exists training_materials_deny_all on public.training_materials;
create policy training_materials_deny_all on public.training_materials for all using (false);

drop policy if exists session_attendance_deny_all on public.session_attendance;
create policy session_attendance_deny_all on public.session_attendance for all using (false);
