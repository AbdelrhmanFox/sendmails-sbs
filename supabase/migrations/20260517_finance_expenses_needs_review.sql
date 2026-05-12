-- Flag expenses imported from WB2 with missing sheet date so staff can fix spent_at and other fields.

alter table public.finance_expenses
  add column if not exists needs_review boolean not null default false,
  add column if not exists import_sheet_row integer;

create index if not exists idx_finance_expenses_needs_review
  on public.finance_expenses (needs_review)
  where needs_review = true;

comment on column public.finance_expenses.needs_review is
  'True when row was imported with placeholder date (missing Excel date); clear after accountant sets real spent_at.';

comment on column public.finance_expenses.import_sheet_row is
  '1-based Excel Sheet1 row number when imported from WB2 (optional traceability).';
