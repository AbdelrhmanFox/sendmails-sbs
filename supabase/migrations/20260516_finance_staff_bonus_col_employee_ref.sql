-- Add bonus_recorded_total_egp (replaces fragile notes-regex parsing) and
-- employee_ref (stable HR key for dedup / import idempotency) to finance_staff.

alter table public.finance_staff
  add column if not exists bonus_recorded_total_egp numeric(12, 2),
  add column if not exists employee_ref text;

create index if not exists idx_finance_staff_employee_ref
  on public.finance_staff (employee_ref)
  where employee_ref is not null;

comment on column public.finance_staff.bonus_recorded_total_egp is
  'For Bonus/incentive rows: total EGP paid across all recorded payments. Kept null on salaried rows so payroll-commitment KPIs stay salary-only.';

comment on column public.finance_staff.employee_ref is
  'Optional stable HR key (e.g. national ID, internal code) used by migration scripts for idempotent upserts and deduplication.';
