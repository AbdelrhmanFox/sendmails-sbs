/** Shared types and helpers for all finance sub-pages. */

export type Kpis = { mtd_revenue: number; outstanding_invoices: number; payment_count: number };
export type RevChart = { currency: string; labels: string[]; values: number[] };
export type MethodChart = { currency: string; labels: string[]; values: number[]; days: number };
export type TraineeChart = { currency: string; labels: string[]; values: number[] };
/** Monthly expenses trend — same shape as RevChart. */
export type ExpenseChart = { currency: string; labels: string[]; values: number[] };
/** Dual-series cash chart: income vs expenses per month. */
export type CashMonthlyChart = { currency: string; labels: string[]; income_values: number[]; expense_values: number[] };
export type ArAging = { as_of: string; buckets: { b0_30: number; b31_60: number; b61_90: number; b90p: number }; currency: string };
export type BatchRow = { batch_id: string; batch_name?: string; course_id?: string };

export type ReceivableRow = {
  enrollment_id: string; trainee_id: string; trainee_name: string | null;
  batch_id: string; payment_status: string;
  fee_due: number | null; total_paid: number; balance: number | null;
  installments: { amount: number; date: string; method: string }[];
};

export type ExpenseRow = {
  id: string; serial: number; date: string; description: string;
  amount: number; funding_source: string | null; batch_id: string | null;
  is_refund: boolean; recorded_by: string | null;
  /** True when imported without a real sheet date — correct the date in Expenses. */
  needs_review?: boolean;
  /** Excel Sheet1 row (1-based) when imported from WB2 incomplete path. */
  import_sheet_row?: number | null;
};

/** Placeholder spent_at from server for incomplete imports; must match finance-data.js. */
export const INCOMPLETE_EXPENSE_DATE = '9999-12-31';

export function expenseDatePending(r: Pick<ExpenseRow, 'needs_review' | 'date'>): boolean {
  return !!r.needs_review || (r.date && String(r.date).slice(0, 10) === INCOMPLETE_EXPENSE_DATE);
}

export type IncomeRow = {
  serial: number; date: string | null; description: string;
  amount: number; batch_id: string | null; payment_id: string;
};

export type ReceiptItem = {
  id: string; serial_number: string; amount: number; currency: string;
  payer_name: string | null; method: string; issued_at: string; issued_by: string;
  enrollment_uuid?: string | null;
};

export type StaffRow = {
  id: string;
  full_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  hire_date: string | null;
  monthly_salary_egp: number | null;
  /** For Bonus/incentive rows: total EGP paid. Null on salaried rows so payroll KPI stays salary-only. */
  bonus_recorded_total_egp: number | null;
  /** Stable HR key (national ID / internal code) used for dedup and import idempotency. */
  employee_ref: string | null;
  status: string;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type RecurringSubscriptionRow = {
  id: string;
  name: string;
  direction: string;
  amount_egp: number;
  cycle: string;
  start_date: string | null;
  next_billing_date: string | null;
  end_date: string | null;
  status: string;
  notes: string | null;
};

export type HrAnalytics = {
  staff_active: number;
  staff_inactive: number;
  monthly_payroll_egp: number;
  subscriptions_active: number;
  monthly_subscriptions_payable_egp: number;
  monthly_subscriptions_receivable_egp: number;
  upcoming_renewals: {
    id: string;
    name: string;
    direction: string;
    next_billing_date: string;
    amount_egp: number;
    cycle: string;
  }[];
};

export type InvoiceRow = Record<string, unknown>;

export function fmt(n: number) {
  if (!Number.isFinite(n)) return '—';
  if (n >= 1_000_000) return `EGP ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `EGP ${Math.round(n / 1000)}K`;
  return `EGP ${Math.round(n)}`;
}

export function fmtFull(n: number) {
  if (!Number.isFinite(n)) return '—';
  return `EGP ${n.toLocaleString('en-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/** Total from staff migration notes: `Total paid (EGP): 4000.00 …` (bonus rows keep monthly_salary null). */
export function parseBonusTotalFromNotes(notes: string | null | undefined): number | null {
  if (!notes) return null;
  const m = notes.match(/Total paid \(EGP\):\s*([\d,]+(?:\.\d+)?)/i);
  if (!m) return null;
  const n = Number(String(m[1]).replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export const CHART_COLORS = [
  'var(--brand-primary)', '#22c55e', '#f59e0b', '#ef4444',
  '#a855f7', '#06b6d4', '#f97316', '#84cc16',
];

/** Convert a positive integer EGP amount to English words for receipt. */
export function egpInWords(amount: number): string {
  const n = Math.round(amount);
  if (n <= 0 || !Number.isFinite(n)) return '—';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function hundreds(num: number): string {
    if (num === 0) return '';
    if (num < 20) return ones[num];
    const t = tens[Math.floor(num / 10)];
    const o = ones[num % 10];
    return t + (o ? ` ${o}` : '');
  }
  function below1000(num: number): string {
    if (num < 100) return hundreds(num);
    return `${ones[Math.floor(num / 100)]} Hundred${num % 100 ? ` ${hundreds(num % 100)}` : ''}`;
  }
  const scales = ['', 'Thousand', 'Million', 'Billion'];
  let remaining = n;
  const parts: string[] = [];
  for (let i = 0; remaining > 0; i++) {
    const chunk = remaining % 1000;
    if (chunk) parts.unshift(`${below1000(chunk)}${scales[i] ? ` ${scales[i]}` : ''}`);
    remaining = Math.floor(remaining / 1000);
  }
  return `${parts.join(', ')} Egyptian Pounds Only`;
}
