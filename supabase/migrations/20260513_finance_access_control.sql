-- Migration: finance access control + enrollment agreed fee + receipt serial
-- Phase A of the finance dashboard expansion.
-- Safe to re-run (IF NOT EXISTS / OR REPLACE / idempotent ALTER).

-- Table: finance_user_batch_access
-- Maps accountant usernames to the batch_ids they are permitted to see.
-- Keyed by app_users.username (same text as the JWT "username" claim).
-- Rows with the same username map to ALLOWED batches; absence of rows
-- means the accountant has zero access (deny by default).
create table if not exists public.finance_user_batch_access (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  batch_id text not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (username, batch_id)
);

create index if not exists idx_finance_access_username on public.finance_user_batch_access (username);
create index if not exists idx_finance_access_batch_id on public.finance_user_batch_access (batch_id);

alter table public.finance_user_batch_access enable row level security;

drop policy if exists finance_user_batch_access_deny_all on public.finance_user_batch_access;
create policy finance_user_batch_access_deny_all
  on public.finance_user_batch_access
  for all using (false);

-- Add agreed_fee to enrollments: allows per-enrollment tuition that differs
-- from the catalogue course.price (common in the workbook).
alter table public.enrollments
  add column if not exists agreed_fee numeric(12, 2);

-- Cash receipt serial sequence and tracking table.
-- Each physical receipt gets a stable human-readable number SBS-RCP-XXXXXX.
create sequence if not exists public.cash_receipts_seq;

create table if not exists public.cash_receipts (
  id uuid primary key default gen_random_uuid(),
  serial_number text unique not null,
  payment_id uuid references public.payments (id) on delete set null,
  enrollment_uuid uuid references public.enrollments (id) on delete set null,
  amount numeric(12, 2) not null,
  currency text not null default 'EGP',
  payer_name text,
  payer_address text,
  method text not null default 'cash',
  cheque_number text,
  cheque_date date,
  notes text,
  issued_by text not null,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_cash_receipts_payment_id on public.cash_receipts (payment_id);
create index if not exists idx_cash_receipts_issued_at on public.cash_receipts (issued_at desc);

alter table public.cash_receipts enable row level security;

drop policy if exists cash_receipts_deny_all on public.cash_receipts;
create policy cash_receipts_deny_all on public.cash_receipts for all using (false);

create or replace function public.next_receipt_serial() returns text
language sql
set search_path = public
as $$
  select 'SBS-RCP-' || lpad(nextval('public.cash_receipts_seq')::text, 6, '0');
$$;
