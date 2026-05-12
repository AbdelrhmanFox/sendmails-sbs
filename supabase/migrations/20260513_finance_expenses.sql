-- Migration: finance_expenses table
-- Represents the المصروفات (expenses / disbursements) side of the SBS cash book
-- (Workbook 2 — مصاريف SBS). Income side is covered by existing `payments` table.
-- Safe to re-run (IF NOT EXISTS).

create table if not exists public.finance_expenses (
  id uuid primary key default gen_random_uuid(),
  spent_at date not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'EGP',
  -- Free-text narrative (Arabic and/or English). Maps "بيان" in the workbook.
  description text not null,
  -- Who recorded the entry. Maps "بمعرفة".
  recorded_by text,
  -- Funding source / cost allocation. Maps "الممول" (e.g. "M+I", "Marwa", "Suez").
  funding_source text,
  -- Optionally link to a program batch for scoped views.
  batch_id text,
  -- Refund tracking: if this expense was subsequently refunded, mark here.
  is_refund boolean not null default false,
  refund_settled_at date,
  -- Audit fields
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_finance_expenses_spent_at on public.finance_expenses (spent_at desc);
create index if not exists idx_finance_expenses_batch_id on public.finance_expenses (batch_id);
create index if not exists idx_finance_expenses_created_at on public.finance_expenses (created_at desc);

alter table public.finance_expenses enable row level security;

drop policy if exists finance_expenses_deny_all on public.finance_expenses;
create policy finance_expenses_deny_all on public.finance_expenses for all using (false);
