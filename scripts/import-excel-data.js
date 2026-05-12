/**
 * One-time import script: reads both Excel workbooks and pushes data into Supabase.
 *
 * WB1 (نموذج-ايصال-استلام-نقدية.xlsx)
 *   Sheets TOT, TOT 2, inside out  →  trainees + batches + enrollments + payments
 *
 * WB2 (مصاريف SBS (2) (2) (1) (1).xlsx)
 *   Sheet1 income side  →  payments (cash-book entries not yet linked to enrollments)
 *   Sheet1 expense side →  finance_expenses
 *
 * Salary-like expense lines (e.g. description contains "مرتب" / "راتب" / "مكافأة" / "bonus") can later be moved to
 * `finance_staff` using: `node scripts/migrate-salary-expenses-to-staff.js --dry-run` then `--apply`.
 * Idempotency: each workbook row is keyed by a stable placeholder email
 *   {slug(name)}.{rawClientId}@pending-update.sbs.local
 *   so re-running the script does not create duplicate trainees/enrollments.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const DRY = process.argv.includes('--dry-run');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

/** Stable SBS-style course/batch for workbook cash-book income (matches migration 20260514). */
const CASH_COURSE_ID = 'SBS-CO-CASHBOOK';
const CASH_BATCH_ID = 'SBS-BA-SBS-CO-CASHBOOK-01';
const CASHBOOK_EMAIL = 'cashbook-income@pending-update.sbs.local';

async function nextTraineeId() {
  const { data, error } = await supabase.rpc('next_trainee_id');
  if (error) throw new Error(error.message);
  return data;
}

async function nextEnrollmentId() {
  const { data, error } = await supabase.rpc('next_enrollment_id');
  if (error) throw new Error(error.message);
  return data;
}

// ── Excel file paths ──────────────────────────────────────────────────────────
const WB1_PATH = 'C:/Users/abdelrahmanahmed/Downloads/نموذج-ايصال-استلام-نقدية.xlsx';
const WB2_PATH = 'C:/Users/abdelrahmanahmed/Downloads/مصاريف SBS (2) (2) (1) (1).xlsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseExcelDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    // Excel serial date
    const d = new Date(Date.UTC(1899, 11, 30) + val * 864e5);
    return d.toISOString().slice(0, 10);
  }
  const s = String(val).trim();
  if (!s) return null;
  // "DD/MM/YYYY"
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
  // "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

function slugify(str) {
  return str.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

let inserted = 0, skipped = 0, errors = 0;
function log(tag, msg) { console.log(`[${tag}] ${msg}`); }

// ── Step 1: WB1 — Installment ledger sheets ───────────────────────────────────

async function importLedgerSheet(sheetName, batchId, courseName, rows) {
  log('BATCH', `Processing sheet "${sheetName}" → batch "${batchId}"`);

  if (!DRY) {
    // Upsert course
    const { error: cErr } = await supabase
      .from('courses')
      .upsert({ course_id: batchId, course_name: courseName, description: courseName, status: 'Active' }, { onConflict: 'course_id' });
    if (cErr) log('WARN', `Course upsert: ${cErr.message}`);

    // Upsert batch
    const { error: bErr } = await supabase
      .from('batches')
      .upsert({ batch_id: batchId, batch_name: courseName, course_id: batchId }, { onConflict: 'batch_id' });
    if (bErr) log('WARN', `Batch upsert: ${bErr.message}`);
  }

  for (const row of rows) {
    const rawId  = String(row[0] || '').trim();
    const name   = String(row[1] || '').trim();
    const feeDue = num(row[5]);
    const inst1  = num(row[6]);
    const inst2  = num(row[7]);
    const inst3  = num(row[8]);

    if (!rawId || !name) continue;

    const email = `${slugify(name) || 'trainee'}.${rawId}@pending-update.sbs.local`;

    if (DRY) {
      log('DRY', `Row ${rawId} name="${name}" fee=${feeDue} inst=[${inst1},${inst2},${inst3}] keyed by ${email}`);
      continue;
    }

    let traineeId;
    const { data: existingTrainee } = await supabase.from('trainees').select('trainee_id').eq('email', email).maybeSingle();
    if (existingTrainee) {
      traineeId = existingTrainee.trainee_id;
    } else {
      traineeId = await nextTraineeId();
      const phoneKey = `${batchId}:${rawId}`;
      let h = 0;
      for (let i = 0; i < phoneKey.length; i += 1) h = (h * 31 + phoneKey.charCodeAt(i)) >>> 0;
      const phone = `+20${String(1000000000 + (h % 1000000000)).slice(1)}`;
      const { error: tErr } = await supabase.from('trainees').insert({
        trainee_id: traineeId,
        full_name: name,
        email,
        phone,
        status: 'Active',
        trainee_type: 'Individual',
      });
      if (tErr) { log('ERR', `Trainee ${email}: ${tErr.message}`); errors++; continue; }
    }

    const { data: existingEn } = await supabase
      .from('enrollments')
      .select('id')
      .eq('trainee_id', traineeId)
      .eq('batch_id', batchId)
      .maybeSingle();

    let enrollmentUuid;
    if (existingEn) {
      enrollmentUuid = existingEn.id;
      skipped++;
    } else {
      const enrollmentId = await nextEnrollmentId();
      const remaining = num(row[10]);
      const payStatus = remaining <= 0 ? 'Paid' : 'Pending';
      const { data: enData, error: enErr } = await supabase
        .from('enrollments')
        .insert({
          enrollment_id: enrollmentId,
          trainee_id: traineeId,
          batch_id: batchId,
          enrollment_status: 'Registered',
          payment_status: payStatus,
          agreed_fee: feeDue || null,
          enroll_date: new Date().toISOString().slice(0, 10),
        })
        .select('id')
        .single();
      if (enErr) { log('ERR', `Enrollment ${batchId}/${traineeId}: ${enErr.message}`); errors++; continue; }
      enrollmentUuid = enData.id;
      inserted++;
    }

    const installments = [inst1, inst2, inst3].filter((v) => v > 0);
    for (let i = 0; i < installments.length; i++) {
      const { data: existPay } = await supabase
        .from('payments')
        .select('id')
        .eq('enrollment_uuid', enrollmentUuid)
        .eq('amount', installments[i])
        .maybeSingle();

      if (!existPay) {
        const { error: pErr } = await supabase.from('payments').insert({
          enrollment_uuid: enrollmentUuid,
          amount: installments[i],
          currency: 'EGP',
          method: 'cash',
          status: 'recorded',
          received_at: new Date().toISOString(),
          created_by: null,
          notes: `Installment ${i + 1}`,
        });
        if (pErr) log('WARN', `Payment inst${i + 1}: ${pErr.message}`);
        else inserted++;
      }
    }
  }
}

// ── Step 2: WB2 — Cash book expenses ─────────────────────────────────────────

async function importExpenses(rows) {
  log('EXPENSES', `Importing ${rows.length} expense rows…`);
  for (const row of rows) {
    const serial      = num(row[9]);
    const dateVal     = row[10];
    const description = String(row[11] || '').trim();
    const amount      = num(row[12]);
    const recordedBy  = String(row[13] || '').trim();
    const funding     = String(row[14] || '').trim();

    if (!description || amount <= 0) continue;

    const spentAt = parseExcelDate(dateVal) || new Date().toISOString().slice(0, 10);

    if (DRY) {
      log('DRY-EXP', `${spentAt} | "${description}" | ${amount} EGP | by ${recordedBy} | ${funding}`);
      continue;
    }

    // Check duplicate by description + amount + date
    const { data: exist } = await supabase
      .from('finance_expenses')
      .select('id')
      .eq('description', description)
      .eq('amount', amount)
      .eq('spent_at', spentAt)
      .maybeSingle();

    if (exist) { skipped++; continue; }

    const { error } = await supabase.from('finance_expenses').insert({
      spent_at: spentAt,
      amount,
      currency: 'EGP',
      description,
      recorded_by: recordedBy || null,
      funding_source: funding || null,
      is_refund: false,
      created_by: recordedBy?.trim() || 'import',
    });
    if (error) { log('ERR', `Expense serial ${serial}: ${error.message}`); errors++; }
    else inserted++;
  }
}

// ── Step 3: WB2 — Cash book income (standalone payments) ─────────────────────

async function importCashbookIncome(rows) {
  log('INCOME', `Importing ${rows.length} income rows as standalone cash-book entries…`);

  let cbEnrollmentUuid = null;
  if (!DRY) {
    await supabase.from('courses').upsert(
      { course_id: CASH_COURSE_ID, course_name: 'Cash book income', description: 'Standalone cash book income', status: 'Active' },
      { onConflict: 'course_id' },
    );
    await supabase.from('batches').upsert(
      { batch_id: CASH_BATCH_ID, batch_name: 'Cash book income', course_id: CASH_COURSE_ID },
      { onConflict: 'batch_id' },
    );

    let { data: tr } = await supabase.from('trainees').select('trainee_id').eq('email', CASHBOOK_EMAIL).maybeSingle();
    let tid;
    if (!tr) {
      tid = await nextTraineeId();
      const { error: te } = await supabase.from('trainees').insert({
        trainee_id: tid,
        full_name: 'Cash book income',
        email: CASHBOOK_EMAIL,
        phone: '+201000000000',
        status: 'Active',
        trainee_type: 'Individual',
      });
      if (te) { log('ERR', `Cashbook trainee: ${te.message}`); return; }
    } else {
      tid = tr.trainee_id;
    }

    const { data: enExisting } = await supabase
      .from('enrollments')
      .select('id')
      .eq('trainee_id', tid)
      .eq('batch_id', CASH_BATCH_ID)
      .maybeSingle();

    if (enExisting) {
      cbEnrollmentUuid = enExisting.id;
    } else {
      const eid = await nextEnrollmentId();
      const { data: enIns, error: ee } = await supabase
        .from('enrollments')
        .insert({
          enrollment_id: eid,
          trainee_id: tid,
          batch_id: CASH_BATCH_ID,
          enrollment_status: 'Registered',
          payment_status: 'Paid',
          enroll_date: new Date().toISOString().slice(0, 10),
        })
        .select('id')
        .single();
      if (ee) { log('ERR', `Cashbook enrollment: ${ee.message}`); return; }
      cbEnrollmentUuid = enIns.id;
    }
  }

  for (const row of rows) {
    const serial      = num(row[0]);
    const dateVal     = row[1];
    const description = String(row[2] || '').trim();
    const amount      = num(row[3]);
    const recordedBy  = String(row[4] || '').trim();

    if (!description || amount <= 0) continue;

    const receivedAt = parseExcelDate(dateVal) || new Date().toISOString().slice(0, 10);

    if (DRY) {
      log('DRY-INC', `${receivedAt} | "${description}" | ${amount} EGP | by ${recordedBy}`);
      continue;
    }

    if (!cbEnrollmentUuid) continue;

    const { data: exist } = await supabase
      .from('payments')
      .select('id')
      .eq('enrollment_uuid', cbEnrollmentUuid)
      .eq('amount', amount)
      .eq('notes', description.slice(0, 200))
      .maybeSingle();

    if (exist) { skipped++; continue; }

    const { error } = await supabase.from('payments').insert({
      enrollment_uuid: cbEnrollmentUuid,
      amount,
      currency: 'EGP',
      method: 'cash',
      status: 'recorded',
      received_at: new Date(receivedAt).toISOString(),
      created_by: recordedBy || null,
      notes: description.slice(0, 500),
    });
    if (error) { log('ERR', `Income serial ${serial}: ${error.message}`); errors++; }
    else inserted++;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY ? '🔍 DRY-RUN MODE — no writes\n' : '🚀 IMPORT MODE — writing to Supabase\n');

  // ── WB1 ────────────────────────────────────────────────────────────────────
  const wb1 = xlsx.readFile(WB1_PATH);

  const ledgerSheets = [
    { sheet: 'TOT',          batchId: 'TOT',          name: 'TOT Program' },
    { sheet: 'TOT 2',        batchId: 'TOT-2',        name: 'TOT Program 2' },
    { sheet: 'inside out',   batchId: 'inside-out',   name: 'Inside Out Journey' },
  ];

  for (const { sheet, batchId, name } of ledgerSheets) {
    const raw = xlsx.utils.sheet_to_json(wb1.Sheets[sheet], { header: 1, defval: '' });
    const rows = raw.slice(1).filter(r => r[0] && r[1] && String(r[1]).trim());
    log('INFO', `Sheet "${sheet}" → ${rows.length} students`);
    await importLedgerSheet(sheet, batchId, name, rows);
  }

  // ── WB2 ────────────────────────────────────────────────────────────────────
  const wb2 = xlsx.readFile(WB2_PATH);
  const sheet1 = xlsx.utils.sheet_to_json(wb2.Sheets['Sheet1'], { header: 1, defval: '' });
  const dataRows = sheet1.slice(2); // skip 2 header rows

  const incomeRows  = dataRows.filter(r => r[0] && r[1] && num(r[3]) > 0);
  const expenseRows = dataRows.filter(r => r[9] && r[10] && num(r[12]) > 0);

  log('INFO', `WB2 income: ${incomeRows.length} rows, expenses: ${expenseRows.length} rows`);

  await importExpenses(expenseRows);
  await importCashbookIncome(incomeRows);

  console.log('\n── Summary ──────────────────────────');
  console.log(`Inserted : ${inserted}`);
  console.log(`Skipped  : ${skipped}`);
  console.log(`Errors   : ${errors}`);
  console.log(DRY ? '(dry-run — nothing was written)' : '✅ Import complete');
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
