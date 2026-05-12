/**
 * Migrate legacy salary-like rows from finance_expenses into finance_staff (payroll reference).
 *
 * Background: Excel import (import-excel-data.js) loads the expense side of WB2 into finance_expenses.
 * Rows described as salary/wages (e.g. Arabic "مرتب", "راتب") or individual bonuses
 * ("مكافأة", "bonus", …) can be moved to Finance → Staff. Bonuses are stored with job_title
 * "Bonus / incentive" and monthly_salary_egp left null so dashboard payroll totals stay salary-only.
 *
 * Usage:
 *   node scripts/migrate-salary-expenses-to-staff.js --dry-run
 *   node scripts/migrate-salary-expenses-to-staff.js --apply
 *   node scripts/migrate-salary-expenses-to-staff.js --apply --delete-expenses
 *
 * When staff rows already exist from a prior --apply, --delete-expenses still removes matching
 * finance_expenses rows for each salary-like group (no duplicate staff inserts).
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (same as import-excel-data.js)
 *
 * Grouping: rows with the exact same `description` are treated as one staff line (same person/label in the sheet).
 * monthly_salary_egp: if all amounts in the group are identical, that value; otherwise the amount from the latest spent_at.
 *
 * Idempotency: skips a group if a finance_staff row already exists with the same full_name AND notes containing
 *   "Migrated from finance_expenses" (re-run safe). Use --force to insert anyway (may duplicate names).
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const DRY = process.argv.includes('--dry-run');
const APPLY = process.argv.includes('--apply');
const DELETE_EXPENSES = process.argv.includes('--delete-expenses');
const FORCE = process.argv.includes('--force');

if (!DRY && !APPLY) {
  console.error('Specify --dry-run or --apply');
  process.exit(1);
}
if (DELETE_EXPENSES && !APPLY) {
  console.error('--delete-expenses requires --apply');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Description matches common salary / payroll wording (Arabic + English). */
const SALARY_RES = [
  /مرتب/i,
  /راتب/i,
  /اجور|أجور|أُجور/i,
  /\bSalary\b/i,
  /\bPayroll\b/i,
  /\bWages?\b/i,
];

function isSalaryLike(description) {
  const d = String(description || '').trim();
  if (!d) return false;
  return SALARY_RES.some((re) => re.test(d));
}

/** Individual-directed bonuses (still listed under Staff, not monthly payroll). */
const BONUS_RES = [
  /مكافأة|مكافاه|مكافاة/i,
  /\bBonus(es)?\b/i,
  /\bIncentives?\b/i,
  /حوافز?|حافز/i,
];

function isBonusLike(description) {
  const d = String(description || '').trim();
  if (!d) return false;
  return BONUS_RES.some((re) => re.test(d));
}

function isMigrantableLike(description) {
  return isSalaryLike(description) || isBonusLike(description);
}

/** True when this line is bonus-only (not also a salary/payroll description). */
function isBonusOnly(description) {
  return isBonusLike(description) && !isSalaryLike(description);
}

/** Best-effort: turn "مرتب - أحمد" / "salary Ahmed" into a display name for Staff.full_name */
function extractStaffName(description) {
  let s = String(description || '').trim();
  s = s.replace(/^(مكافأة|مكافاه|مكافاة|bonus|incentives?|حوافز?|حافز)\s+ل\s*/i, '');
  s = s.replace(/^(مكافأة|مكافاه|مكافاة|bonus|incentives?|حوافز?|حافز)\s*[:،,\-–\.]?\s*/i, '');
  s = s.replace(/^(مرتب|راتب|salary|payroll|wages?)\s*[:،,\-–\.]\s*/i, '');
  s = s.replace(/\s*[:،,\-–\.]\s*(مرتب|راتب|salary|payroll)$/i, '');
  s = s.replace(/\s+(مرتب|راتب|salary|payroll)$/i, '');
  s = s.replace(/\s+(مكافأة|مكافاه|مكافاة|bonus)$/i, '');
  s = s.trim();
  return s || String(description || '').trim();
}

function pickSalaryAmount(rows) {
  const amounts = rows.map((r) => Number(r.amount)).filter((n) => Number.isFinite(n) && n > 0);
  if (amounts.length === 0) return null;
  const uniq = new Set(amounts.map((a) => a.toFixed(2)));
  if (uniq.size === 1) return amounts[0];
  const sorted = [...rows].sort((a, b) => String(a.spent_at).localeCompare(String(b.spent_at)));
  return Number(sorted[sorted.length - 1].amount);
}

async function main() {
  const { data: expenses, error } = await supabase
    .from('finance_expenses')
    .select('id, spent_at, amount, description, recorded_by, funding_source')
    .order('spent_at', { ascending: true });

  if (error) throw new Error(error.message);
  const migrantRows = (expenses || []).filter((r) => isMigrantableLike(r.description));
  if (migrantRows.length === 0) {
    console.log('No finance_expenses rows matched salary or individual-bonus patterns. Nothing to do.');
    return;
  }

  const byDescription = new Map();
  for (const r of migrantRows) {
    const key = String(r.description || '').trim();
    if (!byDescription.has(key)) byDescription.set(key, []);
    byDescription.get(key).push(r);
  }

  console.log(`Matched ${migrantRows.length} expense rows in ${byDescription.size} description group(s).\n`);

  let inserted = 0;
  let skipped = 0;
  let deleted = 0;
  let errors = 0;

  async function deleteExpenseGroup(rawDescription, group) {
    if (!DELETE_EXPENSES || DRY || !APPLY) return;
    const expenseIds = group.map((g) => g.id);
    const { error: delErr } = await supabase.from('finance_expenses').delete().in('id', expenseIds);
    if (delErr) {
      console.error(`ERR delete expenses for "${rawDescription}": ${delErr.message}`);
      errors++;
    } else {
      deleted += expenseIds.length;
      const tail = rawDescription.length > 60 ? `${rawDescription.slice(0, 60)}…` : rawDescription;
      console.log(`  deleted ${expenseIds.length} finance_expenses row(s) for "${tail}"`);
    }
  }

  for (const [rawDescription, group] of byDescription) {
    const fullName = extractStaffName(rawDescription);
    const monthly = pickSalaryAmount(group);
    if (monthly == null || monthly <= 0) {
      console.log(`SKIP (no positive amount): "${rawDescription}"`);
      skipped++;
      continue;
    }

    const bonusOnly = isBonusOnly(rawDescription);
    const ids = group.map((g) => g.id).join(',');
    const firstDate = group[0].spent_at;
    const sortedG = [...group].sort((a, b) => String(a.spent_at).localeCompare(String(b.spent_at)));
    const lastG = sortedG[sortedG.length - 1];
    const totalPaid = group.reduce((s, r) => s + Number(r.amount || 0), 0);

    const noteLines = [
      'Migrated from finance_expenses.',
      bonusOnly
        ? 'Type: individual bonus / incentive (not counted as recurring monthly salary in payroll KPI).'
        : 'Type: salary / wages.',
      `Original description: ${rawDescription}`,
      `Source expense row count: ${group.length}. IDs: ${ids.slice(0, 500)}${ids.length > 500 ? '…' : ''}`,
    ];
    if (bonusOnly) {
      noteLines.push(`Total paid (EGP): ${totalPaid.toFixed(2)} across ${group.length} payment(s).`);
      noteLines.push(`Latest payment: ${Number(lastG.amount).toFixed(2)} on ${String(lastG.spent_at).slice(0, 10)}.`);
    }

    if (!FORCE) {
      const { data: existing } = await supabase
        .from('finance_staff')
        .select('id, notes')
        .eq('full_name', fullName)
        .limit(5);
      const already = (existing || []).some((e) => String(e.notes || '').includes('Migrated from finance_expenses'));
      if (already) {
        await deleteExpenseGroup(rawDescription, group);
        console.log(`SKIP insert (already migrated): "${fullName}"`);
        skipped++;
        continue;
      }
    }

    const row = {
      full_name: fullName.slice(0, 500),
      job_title: bonusOnly ? 'Bonus / incentive' : null,
      email: null,
      phone: null,
      hire_date: firstDate ? String(firstDate).slice(0, 10) : null,
      monthly_salary_egp: bonusOnly ? null : monthly,
      status: 'active',
      notes: noteLines.join('\n'),
      created_by: 'migrate-salary-expenses-to-staff',
    };

    if (DRY) {
      const pay = bonusOnly ? `bonus total=${totalPaid.toFixed(2)} EGP (monthly_salary left null)` : `monthly_salary_egp=${monthly}`;
      console.log(`[DRY] staff ← "${fullName}" | ${pay} | from ${group.length} expense(s)`);
      continue;
    }

    const { data: ins, error: insErr } = await supabase.from('finance_staff').insert(row).select('id').single();
    if (insErr) {
      console.error(`ERR insert "${fullName}": ${insErr.message}`);
      errors++;
      continue;
    }
    inserted++;
    const payLog = bonusOnly ? `bonus, total ${totalPaid.toFixed(2)} EGP` : `${monthly} EGP/mo`;
    console.log(`INSERT staff ${ins.id} ← "${fullName}" (${payLog} from ${group.length} expense row(s))`);

    await deleteExpenseGroup(rawDescription, group);
  }

  console.log('\n── Summary ──');
  console.log(DRY ? 'Mode: dry-run (no writes)' : `Mode: apply | inserted staff: ${inserted}`);
  if (APPLY && DELETE_EXPENSES) console.log(`Deleted finance_expenses rows: ${deleted}`);
  console.log(`Skipped: ${skipped} | Errors: ${errors}`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
