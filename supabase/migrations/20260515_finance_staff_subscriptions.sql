-- Internal staff directory (HR / payroll reference) and recurring subscriptions (monthly, quarterly, yearly).

create table if not exists public.finance_staff (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  job_title text,
  email text,
  phone text,
  hire_date date,
  monthly_salary_egp numeric(12, 2),
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_finance_staff_status on public.finance_staff (status);
create index if not exists idx_finance_staff_full_name on public.finance_staff (full_name);

alter table public.finance_staff enable row level security;

drop policy if exists finance_staff_deny_all on public.finance_staff;
create policy finance_staff_deny_all on public.finance_staff for all using (false);

create table if not exists public.finance_recurring_subscriptions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  direction text not null default 'payable' check (direction in ('payable', 'receivable')),
  amount_egp numeric(12, 2) not null check (amount_egp > 0),
  cycle text not null default 'monthly' check (cycle in ('monthly', 'quarterly', 'yearly')),
  start_date date not null,
  next_billing_date date,
  end_date date,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  notes text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_finance_recurring_status on public.finance_recurring_subscriptions (status);
create index if not exists idx_finance_recurring_next on public.finance_recurring_subscriptions (next_billing_date);

alter table public.finance_recurring_subscriptions enable row level security;

drop policy if exists finance_recurring_subscriptions_deny_all on public.finance_recurring_subscriptions;
create policy finance_recurring_subscriptions_deny_all on public.finance_recurring_subscriptions for all using (false);
