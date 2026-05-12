const { cors, json, getSupabaseServiceClient, verifyAuth, normalizeDate, trimEnvValue } = require('../lib/_shared');

const READ_ROLES = ['admin', 'accountant'];
const WRITE_ROLES = ['admin', 'accountant'];

function canRead(role) {
  return READ_ROLES.includes(role);
}

function canWrite(role) {
  return WRITE_ROLES.includes(role);
}

async function writeAudit(supabase, actor, action, entity, entityId, payload) {
  await supabase.from('finance_audit_log').insert({
    actor: actor || 'unknown',
    action,
    entity,
    entity_id: entityId ? String(entityId) : null,
    payload: payload || null,
  });
}

function parsePage(q) {
  const page = Math.max(1, parseInt(String(q.page || '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(q.pageSize || '50'), 10) || 50));
  return { page, pageSize, from: (page - 1) * pageSize, to: (page - 1) * pageSize + pageSize - 1 };
}

function monthlyEquivalent(amount, cycle) {
  const a = Number(amount || 0);
  if (!Number.isFinite(a) || a <= 0) return 0;
  if (cycle === 'yearly') return a / 12;
  if (cycle === 'quarterly') return a / 3;
  return a;
}

/** Add calendar months in UTC to YYYY-MM-DD. */
function addMonthsIso(isoDateStr, months) {
  const d = new Date(`${isoDateStr}T12:00:00.000Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** First billing date on or after `asOf` (exclusive roll from start). */
function nextBillingOnOrAfter(startStr, cycle, asOfStr) {
  const step = cycle === 'yearly' ? 12 : cycle === 'quarterly' ? 3 : 1;
  let cur = startStr;
  const asOf = asOfStr;
  let guard = 0;
  while (cur < asOf && guard < 500) {
    cur = addMonthsIso(cur, step);
    guard += 1;
  }
  return cur;
}


exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(event.httpMethod)) return json({ error: 'Method not allowed' }, 405);

  const auth = verifyAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  const role = auth.role;
  if (!canRead(role)) return json({ error: 'Forbidden' }, 403);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  const resource = String(event.queryStringParameters?.resource || '').trim().toLowerCase();

  // Secured snapshot for n8n / automation (no JWT; shared secret).
  if (resource === 'n8n-report' && event.httpMethod === 'POST') {
    const secret = trimEnvValue(process.env.N8N_FINANCE_WEBHOOK_SECRET);
    const hdr =
      event.headers['x-n8n-secret'] ||
      event.headers['X-N8n-Secret'] ||
      event.headers['x-webhook-secret'] ||
      '';
    if (!secret || String(hdr).trim() !== secret) return json({ error: 'Forbidden' }, 403);
    const { data: pay } = await supabase
      .from('payments')
      .select('amount, received_at')
      .gte('received_at', new Date(Date.now() - 7 * 864e5).toISOString());
    const sum7 = (pay || []).reduce((s, p) => s + Number(p.amount || 0), 0);
    const { count: invCount } = await supabase.from('invoices').select('*', { count: 'exact', head: true });
    return json({
      ok: true,
      generated_at: new Date().toISOString(),
      payments_last_7d_sum: sum7,
      invoice_row_estimate: invCount || 0,
    });
  }

  const username = String(auth.username || auth.sub || '');

  // --- READ: my-batches ---
  if (event.httpMethod === 'GET' && resource === 'my-batches') {
    const { data } = await supabase.from('batches').select('batch_id, batch_name, course_id').order('batch_id');
    return json({ items: data || [] });
  }

  // --- READ: field-suggestions ---
  // Returns up to 30 distinct past values for a known finance field.
  // entity: expense-description | expense-funding | expense-by | receipt-payer | payment-notes
  if (event.httpMethod === 'GET' && resource === 'field-suggestions') {
    const entity = String(event.queryStringParameters?.entity || '').trim().toLowerCase();
    const q = String(event.queryStringParameters?.q || '').trim();
    const limit = Math.min(30, Math.max(1, parseInt(String(event.queryStringParameters?.limit || '30'), 10) || 30));

    const ENTITY_MAP = {
      'expense-description': { table: 'finance_expenses', column: 'description' },
      'expense-funding':     { table: 'finance_expenses', column: 'funding_source' },
      'expense-by':          { table: 'finance_expenses', column: 'recorded_by' },
      'receipt-payer':       { table: 'cash_receipts',    column: 'payer_name' },
      'payment-notes':       { table: 'payments',         column: 'notes' },
      'payment-reference':   { table: 'payments',         column: 'reference' },
    };

    const mapping = ENTITY_MAP[entity];
    if (!mapping) return json({ items: [] });

    const col = mapping.column;
    let dbq = supabase
      .from(mapping.table)
      .select(col)
      .not(col, 'is', null)
      .neq(col, '')
      .order(col, { ascending: true });

    if (q.length >= 1) dbq = dbq.ilike(col, `%${q.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`);

    const { data } = await dbq.limit(limit * 3); // over-fetch to dedup

    const seen = new Set();
    const items = [];
    for (const row of (data || [])) {
      const val = String(row[col] || '').trim();
      if (val && !seen.has(val)) {
        seen.add(val);
        items.push(val);
        if (items.length >= limit) break;
      }
    }
    return json({ items });
  }

  // --- READ: enrollment-search ---
  if (event.httpMethod === 'GET' && resource === 'enrollment-search') {
    const raw = String(event.queryStringParameters?.q || '').trim();
    if (raw.length < 2) return json({ items: [] });
    const limit = Math.min(25, Math.max(1, parseInt(String(event.queryStringParameters?.limit || '20'), 10) || 20));
    const batchFilter = String(event.queryStringParameters?.batch_id || '').trim();

    // Escape SQL pattern chars
    const pattern = raw.replace(/%/g, '\\%').replace(/_/g, '\\_');

    // Query 1: match by enrollment_id or trainee_id
    let q1 = supabase
      .from('enrollments')
      .select('enrollment_id, trainee_id, batch_id, trainees ( full_name )')
      .or(`enrollment_id.ilike.%${pattern}%,trainee_id.ilike.%${pattern}%`)
      .order('enrollment_id', { ascending: true })
      .limit(limit);
    if (batchFilter) q1 = q1.eq('batch_id', batchFilter);

    // Query 2: match by trainee full_name
    let nameMatched = [];
    const { data: nameTrainees } = await supabase
      .from('trainees')
      .select('trainee_id')
      .ilike('full_name', `%${pattern}%`)
      .limit(limit);
    if (nameTrainees && nameTrainees.length > 0) {
      const tIds = nameTrainees.map((t) => t.trainee_id);
      let q2 = supabase
        .from('enrollments')
        .select('enrollment_id, trainee_id, batch_id, trainees ( full_name )')
        .in('trainee_id', tIds)
        .order('enrollment_id', { ascending: true })
        .limit(limit);
      if (batchFilter) q2 = q2.eq('batch_id', batchFilter);
      const { data: q2data } = await q2;
      nameMatched = q2data || [];
    }

    const { data: q1data } = await q1;
    const byId = new Map();
    [...(q1data || []), ...nameMatched].forEach((row) => {
      if (!byId.has(row.enrollment_id)) byId.set(row.enrollment_id, row);
    });

    const items = [...byId.values()]
      .sort((a, b) => String(a.enrollment_id).localeCompare(String(b.enrollment_id)))
      .slice(0, limit)
      .map((row) => {
        const tr = Array.isArray(row.trainees) ? row.trainees[0] : row.trainees;
        return {
          enrollment_id: row.enrollment_id,
          trainee_id: row.trainee_id,
          batch_id: row.batch_id,
          trainee_name: tr ? tr.full_name : null,
        };
      });

    return json({ items });
  }

  // --- READ: KPIs ---
  if (event.httpMethod === 'GET' && resource === 'kpis') {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    const [{ data: paymentsMtd }, { count: payment_count }] = await Promise.all([
      supabase.from('payments').select('amount').gte('received_at', startOfMonth),
      supabase.from('payments').select('*', { count: 'exact', head: true }),
    ]);
    const mtd_revenue = (paymentsMtd || []).reduce((s, p) => s + Number(p.amount || 0), 0);

    // Invoices: company-level, show org-wide to all finance readers.
    const { data: invs } = await supabase.from('invoices').select('total, status');
    const closed = new Set(['paid', 'void', 'draft']);
    const outstanding = (invs || [])
      .filter((i) => !closed.has(String(i.status || '').toLowerCase()))
      .reduce((s, i) => s + Number(i.total || 0), 0);

    return json({ mtd_revenue, outstanding_invoices: outstanding, payment_count: payment_count || 0 });
  }

  // --- READ: HR & recurring subscriptions snapshot (dashboard analytics) ---
  if (event.httpMethod === 'GET' && resource === 'hr-analytics') {
    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

    const [{ data: staffRows, error: staffErr }, { data: subRows, error: subErr }] = await Promise.all([
      supabase.from('finance_staff').select('status, monthly_salary_egp'),
      supabase
        .from('finance_recurring_subscriptions')
        .select('id, name, direction, amount_egp, cycle, status, next_billing_date, start_date'),
    ]);
    if (staffErr) return json({ error: staffErr.message || 'Staff analytics failed' }, 500);
    if (subErr) return json({ error: subErr.message || 'Subscriptions analytics failed' }, 500);

    let staff_active = 0;
    let staff_inactive = 0;
    let monthly_payroll_egp = 0;
    for (const r of staffRows || []) {
      const st = String(r.status || '').toLowerCase();
      if (st === 'active') {
        staff_active += 1;
        monthly_payroll_egp += Number(r.monthly_salary_egp || 0);
      } else staff_inactive += 1;
    }

    let subscriptions_active = 0;
    let monthly_subscriptions_payable_egp = 0;
    let monthly_subscriptions_receivable_egp = 0;
    const upcoming = [];

    for (const r of subRows || []) {
      if (String(r.status || '').toLowerCase() !== 'active') continue;
      subscriptions_active += 1;
      const cycle = String(r.cycle || 'monthly').toLowerCase();
      const me = monthlyEquivalent(r.amount_egp, cycle);
      if (String(r.direction || '').toLowerCase() === 'receivable') monthly_subscriptions_receivable_egp += me;
      else monthly_subscriptions_payable_egp += me;

      const nb = r.next_billing_date ? String(r.next_billing_date).slice(0, 10) : null;
      const sd = r.start_date ? String(r.start_date).slice(0, 10) : null;
      const effectiveNext = nb || (sd ? nextBillingOnOrAfter(sd, cycle, today) : null);
      if (effectiveNext && effectiveNext >= today && effectiveNext <= in30) {
        upcoming.push({
          id: r.id,
          name: r.name,
          direction: r.direction,
          next_billing_date: effectiveNext,
          amount_egp: Number(r.amount_egp || 0),
          cycle,
        });
      }
    }

    upcoming.sort((a, b) => String(a.next_billing_date).localeCompare(String(b.next_billing_date)));

    return json({
      staff_active,
      staff_inactive,
      monthly_payroll_egp,
      subscriptions_active,
      monthly_subscriptions_payable_egp,
      monthly_subscriptions_receivable_egp,
      upcoming_renewals: upcoming.slice(0, 12),
    });
  }

  // --- READ: chart-revenue-trend ---
  if (event.httpMethod === 'GET' && resource === 'chart-revenue-trend') {
    const months = Math.min(24, Math.max(3, parseInt(String(event.queryStringParameters?.months || '6'), 10) || 6));
    const today = new Date();
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (months - 1), 1));
    const startIso = start.toISOString();

    const { data: payments, error } = await supabase.from('payments').select('amount, received_at').gte('received_at', startIso);
    if (error) return json({ error: error.message || 'Chart query failed' }, 500);

    const byMonth = {};
    const keys = [];
    for (let i = 0; i < months; i += 1) {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (months - 1 - i), 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      keys.push(key);
      byMonth[key] = 0;
    }
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    (payments || []).forEach((p) => {
      if (!p.received_at) return;
      const dt = new Date(p.received_at);
      const key = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
      if (Object.prototype.hasOwnProperty.call(byMonth, key)) byMonth[key] += Number(p.amount || 0);
    });
    const values = keys.map((k) => byMonth[k] || 0);
    const labels = keys.map((k) => {
      const [, m] = k.split('-');
      const y = k.split('-')[0];
      return `${monthNames[parseInt(m, 10) - 1]} ${y}`;
    });
    return json({ currency: 'EGP', labels, values });
  }

  // --- READ: chart-payment-methods ---
  if (event.httpMethod === 'GET' && resource === 'chart-payment-methods') {
    const days = Math.min(365, Math.max(30, parseInt(String(event.queryStringParameters?.days || '90'), 10) || 90));
    const start = new Date(Date.now() - days * 864e5).toISOString();

    const { data: payments, error } = await supabase.from('payments').select('amount, method').gte('received_at', start);
    if (error) return json({ error: error.message || 'Chart query failed' }, 500);

    const byMethod = {};
    (payments || []).forEach((p) => {
      const m = String(p.method || 'Unspecified').trim() || 'Unspecified';
      byMethod[m] = (byMethod[m] || 0) + Math.abs(Number(p.amount || 0));
    });
    const entries = Object.entries(byMethod).sort((a, b) => b[1] - a[1]);
    const topN = 8;
    let labels, values;
    if (entries.length <= topN) {
      labels = entries.map((e) => e[0]);
      values = entries.map((e) => e[1]);
    } else {
      const head = entries.slice(0, topN - 1);
      const rest = entries.slice(topN - 1);
      const otherSum = rest.reduce((s, e) => s + e[1], 0);
      labels = [...head.map((e) => e[0]), 'Other'];
      values = [...head.map((e) => e[1]), otherSum];
    }
    return json({ currency: 'EGP', labels, values, days });
  }

  // --- READ: chart-payments-by-trainee ---
  if (event.httpMethod === 'GET' && resource === 'chart-payments-by-trainee') {
    const days = Math.min(730, Math.max(30, parseInt(String(event.queryStringParameters?.days || '365'), 10) || 365));
    const start = new Date(Date.now() - days * 864e5).toISOString();

    const { data: pay, error } = await supabase.from('payments').select('amount, enrollments ( trainee_id )').gte('received_at', start);
    if (error) return json({ error: error.message || 'Chart query failed' }, 500);

    const byTrainee = {};
    (pay || []).forEach((p) => {
      const en = p.enrollments;
      const row = Array.isArray(en) ? en[0] : en;
      const tid = row && row.trainee_id;
      if (!tid) return;
      byTrainee[tid] = (byTrainee[tid] || 0) + Math.abs(Number(p.amount || 0));
    });
    const entries = Object.entries(byTrainee).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const ids = entries.map((e) => e[0]);
    let labels = entries.map(([tid]) => tid);
    if (ids.length) {
      const { data: trainees, error: te } = await supabase.from('trainees').select('trainee_id, full_name').in('trainee_id', ids);
      if (!te && trainees && trainees.length) {
        const nameBy = Object.fromEntries(trainees.map((t) => [t.trainee_id, t.full_name]));
        labels = entries.map(([tid]) => { const n = nameBy[tid]; return n ? `${n} (${tid})` : tid; });
      }
    }
    return json({ currency: 'EGP', labels, values: entries.map(([, v]) => v), days });
  }

  // --- READ: ledger ---
  if (event.httpMethod === 'GET' && resource === 'ledger') {
    const { page, pageSize, from, to } = parsePage(event.queryStringParameters || {});
    const fromDate = event.queryStringParameters?.from ? normalizeDate(event.queryStringParameters.from) : null;
    const toDate = event.queryStringParameters?.to ? normalizeDate(event.queryStringParameters.to) : null;
    const method = String(event.queryStringParameters?.method || '').trim();
    const enrollmentFilter = String(event.queryStringParameters?.enrollment_id || '').trim();

    let enrollmentUuid = null;
    if (enrollmentFilter) {
      const { data: en } = await supabase.from('enrollments').select('id').eq('enrollment_id', enrollmentFilter).maybeSingle();
      if (!en) return json({ items: [], total: 0, page, pageSize });
      enrollmentUuid = en.id;
    }

    let q = supabase
      .from('payments')
      .select('id, amount, currency, method, received_at, reference, status, notes, created_by, created_at, enrollment_uuid, enrollments ( enrollment_id, trainee_id, batch_id )', { count: 'exact' })
      .order('received_at', { ascending: false });

    if (enrollmentUuid) q = q.eq('enrollment_uuid', enrollmentUuid);
    if (fromDate) q = q.gte('received_at', `${fromDate}T00:00:00.000Z`);
    if (toDate) q = q.lte('received_at', `${toDate}T23:59:59.999Z`);
    if (method) q = q.ilike('method', `%${method}%`);

    const { data: rows, error, count } = await q.range(from, to);
    if (error) return json({ error: error.message || 'Ledger query failed' }, 500);
    return json({ items: rows || [], total: count != null ? count : (rows || []).length, page, pageSize });
  }

  // --- READ: receivables (workbook-shaped installment view per batch) ---
  if (event.httpMethod === 'GET' && resource === 'receivables') {
    const batchFilter = String(event.queryStringParameters?.batch_id || '').trim();

    let q = supabase
      .from('enrollments')
      .select('id, enrollment_id, trainee_id, batch_id, payment_status, agreed_fee, amount_paid, trainees ( full_name ), batches ( course_id, courses ( price ) )')
      .order('trainee_id', { ascending: true });

    if (batchFilter) q = q.eq('batch_id', batchFilter);

    const { data: enrollments, error } = await q.limit(500);
    if (error) return json({ error: error.message || 'Receivables query failed' }, 500);

    // Fetch last 3 payments for each enrollment
    const envUuids = (enrollments || []).map((e) => e.id);
    let paymentsByEnv = {};
    if (envUuids.length) {
      const { data: pays } = await supabase
        .from('payments')
        .select('enrollment_uuid, amount, received_at, method')
        .in('enrollment_uuid', envUuids)
        .order('received_at', { ascending: true });
      (pays || []).forEach((p) => {
        if (!paymentsByEnv[p.enrollment_uuid]) paymentsByEnv[p.enrollment_uuid] = [];
        paymentsByEnv[p.enrollment_uuid].push(p);
      });
    }

    const items = (enrollments || []).map((en) => {
      const trainee = Array.isArray(en.trainees) ? en.trainees[0] : en.trainees;
      const batch = Array.isArray(en.batches) ? en.batches[0] : en.batches;
      const course = batch && (Array.isArray(batch.courses) ? batch.courses[0] : batch.courses);
      const fee = en.agreed_fee != null ? Number(en.agreed_fee) : (course && course.price != null ? Number(course.price) : null);
      const allPays = paymentsByEnv[en.id] || [];
      const totalPaid = allPays.reduce((s, p) => s + Number(p.amount || 0), 0);
      const installments = allPays.slice(-3).map((p) => ({ amount: Number(p.amount), date: p.received_at, method: p.method }));
      return {
        enrollment_id: en.enrollment_id,
        trainee_id: en.trainee_id,
        trainee_name: trainee ? trainee.full_name : null,
        batch_id: en.batch_id,
        payment_status: en.payment_status,
        fee_due: fee,
        total_paid: totalPaid,
        balance: fee != null ? fee - totalPaid : null,
        installments,
      };
    });
    return json({ items, batch_id: batchFilter || null });
  }

  // --- READ: ar-aging ---
  if (event.httpMethod === 'GET' && resource === 'ar-aging') {
    const asOfStr = event.queryStringParameters?.as_of ? normalizeDate(event.queryStringParameters.as_of) : null;
    const asOf = asOfStr ? new Date(asOfStr + 'T12:00:00Z') : new Date();
    const { data: invsRaw, error } = await supabase.from('invoices').select('id, invoice_number, due_date, total, status, company_id').limit(2000);
    if (error) return json({ error: error.message || 'AR query failed' }, 500);

    const closed = new Set(['paid', 'void', 'draft']);
    const invs = (invsRaw || []).filter((inv) => inv.due_date && !closed.has(String(inv.status || '').toLowerCase()));

    const buckets = { b0_30: 0, b31_60: 0, b61_90: 0, b90p: 0 };
    const asOfTime = asOf.getTime();
    invs.forEach((inv) => {
      if (!inv.due_date) return;
      const due = new Date(String(inv.due_date) + 'T12:00:00Z').getTime();
      const days = Math.floor((asOfTime - due) / 864e5);
      if (days < 0) return;
      const amt = Number(inv.total || 0);
      if (days <= 30) buckets.b0_30 += amt;
      else if (days <= 60) buckets.b31_60 += amt;
      else if (days <= 90) buckets.b61_90 += amt;
      else buckets.b90p += amt;
    });
    return json({ as_of: asOfStr || asOf.toISOString().slice(0, 10), buckets, currency: 'EGP' });
  }

  // --- READ: invoices ---
  if (event.httpMethod === 'GET' && resource === 'invoices') {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, companies ( id, name ), invoice_lines ( id, description, line_total, enrollment_uuid )')
      .order('issue_date', { ascending: false })
      .limit(200);
    if (error) return json({ error: error.message || 'Could not load invoices' }, 500);
    return json({ items: data || [] });
  }

  // --- READ: cashbook (income + expenses side-by-side) ---
  if (event.httpMethod === 'GET' && resource === 'cashbook') {
    const fromDate = event.queryStringParameters?.from ? normalizeDate(event.queryStringParameters.from) : null;
    const toDate = event.queryStringParameters?.to ? normalizeDate(event.queryStringParameters.to) : null;
    const batchFilter = String(event.queryStringParameters?.batch_id || '').trim();

    // Income side: payments (optionally filtered by batch)
    let incQ = supabase
      .from('payments')
      .select('id, amount, received_at, method, enrollments ( enrollment_id, trainee_id, batch_id, trainees ( full_name ) )')
      .order('received_at', { ascending: true })
      .limit(500);
    if (batchFilter) {
      const { data: batchEnvs } = await supabase.from('enrollments').select('id').eq('batch_id', batchFilter);
      const bids = (batchEnvs || []).map((e) => e.id);
      if (bids.length > 0) incQ = incQ.in('enrollment_uuid', bids);
      else incQ = null;
    }
    if (fromDate && incQ) incQ = incQ.gte('received_at', `${fromDate}T00:00:00.000Z`);
    if (toDate && incQ) incQ = incQ.lte('received_at', `${toDate}T23:59:59.999Z`);
    const incomeRows = incQ ? (await incQ).data || [] : [];

    const income = incomeRows.map((p, i) => {
      const en = Array.isArray(p.enrollments) ? p.enrollments[0] : p.enrollments;
      const tr = en && (Array.isArray(en.trainees) ? en.trainees[0] : en.trainees);
      return {
        serial: i + 1,
        date: p.received_at ? p.received_at.slice(0, 10) : null,
        description: tr ? `${tr.full_name || en.trainee_id} — ${en.batch_id || ''}` : (en ? en.enrollment_id : '—'),
        amount: Number(p.amount || 0),
        batch_id: en ? en.batch_id : null,
        payment_id: p.id,
      };
    });

    // Expenses side
    let expQ = supabase.from('finance_expenses').select('*').order('spent_at', { ascending: true }).limit(500);
    if (batchFilter) expQ = expQ.or(`batch_id.eq.${batchFilter},batch_id.is.null`);
    if (fromDate) expQ = expQ.gte('spent_at', fromDate);
    if (toDate) expQ = expQ.lte('spent_at', toDate);
    const { data: expData } = await expQ;
    const expenses = (expData || []).map((e, i) => ({
      serial: i + 1,
      id: e.id,
      date: e.spent_at,
      description: e.description,
      amount: Number(e.amount || 0),
      funding_source: e.funding_source,
      batch_id: e.batch_id,
      is_refund: e.is_refund,
      recorded_by: e.recorded_by,
    }));

    return json({ income, expenses, currency: 'EGP' });
  }

  // --- READ: receipts ---
  if (event.httpMethod === 'GET' && resource === 'receipts') {
    const { page, pageSize, from, to } = parsePage(event.queryStringParameters || {});
    const { data, error, count } = await supabase
      .from('cash_receipts')
      .select('*, enrollments ( enrollment_id, batch_id, trainee_id )', { count: 'exact' })
      .order('issued_at', { ascending: false })
      .range(from, to);
    if (error) return json({ error: error.message || 'Receipts query failed' }, 500);
    return json({ items: data || [], total: count != null ? count : 0, page, pageSize });
  }

  // --- WRITE: payment ---
  if (event.httpMethod === 'POST' && resource === 'payment') {
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch (_) { return json({ error: 'Invalid JSON' }, 400); }
    const enrollmentKey = String(body.enrollment_id || '').trim();
    const amount = body.amount === '' || body.amount == null ? NaN : Number(body.amount);
    if (!enrollmentKey || Number.isNaN(amount)) return json({ error: 'enrollment_id and amount required' }, 400);
    const methodNorm = String(body.method || '').trim().toLowerCase();
    if (amount < 0 && methodNorm !== 'refund') return json({ error: 'Negative amounts are only allowed when method is "refund"' }, 400);

    const { data: en, error: enErr } = await supabase.from('enrollments').select('id, batch_id').eq('enrollment_id', enrollmentKey).maybeSingle();
    if (enErr || !en) return json({ error: 'Enrollment not found for enrollment_id' }, 400);

    const row = {
      enrollment_uuid: en.id,
      amount,
      currency: String(body.currency || 'EGP').trim() || 'EGP',
      method: body.method != null ? String(body.method).trim() : null,
      received_at: body.received_at ? new Date(String(body.received_at)).toISOString() : new Date().toISOString(),
      reference: body.reference != null ? String(body.reference).trim() : null,
      status: String(body.status || 'recorded').trim(),
      notes: body.notes != null ? String(body.notes).trim() : null,
      created_by: username,
    };

    const { data: inserted, error } = await supabase.from('payments').insert(row).select('*').single();
    if (error) return json({ error: error.message || 'Payment insert failed' }, 500);
    await writeAudit(supabase, username, 'insert', 'payment', inserted.id, { amount, enrollment_id: enrollmentKey, method: row.method });
    return json({ ok: true, item: inserted });
  }

  // --- WRITE: expense ---
  if (resource === 'expense') {
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);

    if (event.httpMethod === 'POST') {
      let body;
      try { body = JSON.parse(event.body || '{}'); } catch (_) { return json({ error: 'Invalid JSON' }, 400); }
      const description = String(body.description || '').trim();
      const spentAt = normalizeDate(body.spent_at) || new Date().toISOString().slice(0, 10);
      const amount = body.amount == null ? NaN : Number(body.amount);
      if (!description || Number.isNaN(amount) || amount <= 0) return json({ error: 'description and positive amount required' }, 400);
      const batchId = body.batch_id ? String(body.batch_id).trim() : null;

      const row = {
        spent_at: spentAt,
        amount,
        currency: String(body.currency || 'EGP').trim() || 'EGP',
        description,
        recorded_by: body.recorded_by != null ? String(body.recorded_by).trim() : username,
        funding_source: body.funding_source != null ? String(body.funding_source).trim() : null,
        batch_id: batchId,
        is_refund: !!body.is_refund,
        refund_settled_at: body.refund_settled_at ? normalizeDate(body.refund_settled_at) : null,
        created_by: username,
      };
      const { data: inserted, error } = await supabase.from('finance_expenses').insert(row).select('*').single();
      if (error) return json({ error: error.message || 'Expense insert failed' }, 500);
      await writeAudit(supabase, username, 'insert', 'expense', inserted.id, { amount, description: description.slice(0, 100) });
      return json({ ok: true, item: inserted });
    }

    if (event.httpMethod === 'PUT') {
      let body;
      try { body = JSON.parse(event.body || '{}'); } catch (_) { return json({ error: 'Invalid JSON' }, 400); }
      const id = String(body.id || '').trim();
      if (!id) return json({ error: 'id required' }, 400);

      const { data: existing } = await supabase.from('finance_expenses').select('batch_id').eq('id', id).maybeSingle();
      if (!existing) return json({ error: 'Expense not found' }, 404);

      const updates = {};
      if (body.spent_at !== undefined) updates.spent_at = normalizeDate(body.spent_at);
      if (body.amount !== undefined) updates.amount = Number(body.amount);
      if (body.currency !== undefined) updates.currency = String(body.currency).trim();
      if (body.description !== undefined) updates.description = String(body.description).trim();
      if (body.recorded_by !== undefined) updates.recorded_by = String(body.recorded_by).trim();
      if (body.funding_source !== undefined) updates.funding_source = body.funding_source ? String(body.funding_source).trim() : null;
      if (body.batch_id !== undefined) updates.batch_id = body.batch_id ? String(body.batch_id).trim() : null;
      if (body.is_refund !== undefined) updates.is_refund = !!body.is_refund;
      if (body.refund_settled_at !== undefined) updates.refund_settled_at = body.refund_settled_at ? normalizeDate(body.refund_settled_at) : null;
      updates.updated_at = new Date().toISOString();

      const { data: updated, error } = await supabase.from('finance_expenses').update(updates).eq('id', id).select('*').single();
      if (error) return json({ error: error.message || 'Expense update failed' }, 500);
      await writeAudit(supabase, username, 'update', 'expense', id, updates);
      return json({ ok: true, item: updated });
    }

    if (event.httpMethod === 'DELETE') {
      const id = String(event.queryStringParameters?.id || '').trim();
      if (!id) return json({ error: 'id query required' }, 400);
      const { data: existing } = await supabase.from('finance_expenses').select('batch_id').eq('id', id).maybeSingle();
      if (!existing) return json({ error: 'Expense not found' }, 404);
      const { error } = await supabase.from('finance_expenses').delete().eq('id', id);
      if (error) return json({ error: error.message || 'Expense delete failed' }, 500);
      await writeAudit(supabase, username, 'delete', 'expense', id, null);
      return json({ ok: true });
    }
  }

  // --- READ: staff ---
  if (event.httpMethod === 'GET' && resource === 'staff') {
    const { data, error } = await supabase.from('finance_staff').select('*').order('full_name', { ascending: true });
    if (error) return json({ error: error.message || 'Staff query failed' }, 500);
    return json({ items: data || [] });
  }

  // --- WRITE: staff ---
  if (resource === 'staff' && event.httpMethod !== 'GET') {
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);

    if (event.httpMethod === 'POST') {
      let body;
      try { body = JSON.parse(event.body || '{}'); } catch (_) { return json({ error: 'Invalid JSON' }, 400); }
      const full_name = String(body.full_name || '').trim();
      if (!full_name) return json({ error: 'full_name required' }, 400);
      const status = String(body.status || 'active').trim().toLowerCase();
      if (!['active', 'inactive'].includes(status)) return json({ error: 'invalid status' }, 400);
      const row = {
        full_name,
        job_title: body.job_title != null ? String(body.job_title).trim() : null,
        email: body.email != null ? String(body.email).trim() : null,
        phone: body.phone != null ? String(body.phone).trim() : null,
        hire_date: body.hire_date ? normalizeDate(body.hire_date) : null,
        monthly_salary_egp: body.monthly_salary_egp != null && body.monthly_salary_egp !== '' ? Number(body.monthly_salary_egp) : null,
        bonus_recorded_total_egp: body.bonus_recorded_total_egp != null && body.bonus_recorded_total_egp !== '' ? Number(body.bonus_recorded_total_egp) : null,
        employee_ref: body.employee_ref != null ? String(body.employee_ref).trim() || null : null,
        status,
        notes: body.notes != null ? String(body.notes).trim() : null,
        created_by: username,
      };
      const { data: inserted, error } = await supabase.from('finance_staff').insert(row).select('*').single();
      if (error) return json({ error: error.message || 'Staff insert failed' }, 500);
      await writeAudit(supabase, username, 'insert', 'finance_staff', inserted.id, { full_name: full_name.slice(0, 80) });
      return json({ ok: true, item: inserted });
    }

    if (event.httpMethod === 'PUT') {
      let body;
      try { body = JSON.parse(event.body || '{}'); } catch (_) { return json({ error: 'Invalid JSON' }, 400); }
      const id = String(body.id || '').trim();
      if (!id) return json({ error: 'id required' }, 400);
      const { data: existing } = await supabase.from('finance_staff').select('id').eq('id', id).maybeSingle();
      if (!existing) return json({ error: 'Staff record not found' }, 404);
      const updates = { updated_at: new Date().toISOString() };
      if (body.full_name !== undefined) {
        const fn = String(body.full_name).trim();
        if (!fn) return json({ error: 'full_name cannot be empty' }, 400);
        updates.full_name = fn;
      }
      if (body.job_title !== undefined) updates.job_title = body.job_title ? String(body.job_title).trim() : null;
      if (body.email !== undefined) updates.email = body.email ? String(body.email).trim() : null;
      if (body.phone !== undefined) updates.phone = body.phone ? String(body.phone).trim() : null;
      if (body.hire_date !== undefined) updates.hire_date = body.hire_date ? normalizeDate(body.hire_date) : null;
      if (body.monthly_salary_egp !== undefined) {
        updates.monthly_salary_egp = body.monthly_salary_egp === '' || body.monthly_salary_egp == null ? null : Number(body.monthly_salary_egp);
      }
      if (body.bonus_recorded_total_egp !== undefined) {
        updates.bonus_recorded_total_egp = body.bonus_recorded_total_egp === '' || body.bonus_recorded_total_egp == null ? null : Number(body.bonus_recorded_total_egp);
      }
      if (body.employee_ref !== undefined) {
        updates.employee_ref = body.employee_ref ? String(body.employee_ref).trim() || null : null;
      }
      if (body.status !== undefined) {
        const st = String(body.status).trim().toLowerCase();
        if (!['active', 'inactive'].includes(st)) return json({ error: 'invalid status' }, 400);
        updates.status = st;
      }
      if (body.notes !== undefined) updates.notes = body.notes ? String(body.notes).trim() : null;
      const { data: updated, error } = await supabase.from('finance_staff').update(updates).eq('id', id).select('*').single();
      if (error) return json({ error: error.message || 'Staff update failed' }, 500);
      await writeAudit(supabase, username, 'update', 'finance_staff', id, updates);
      return json({ ok: true, item: updated });
    }

    if (event.httpMethod === 'DELETE') {
      const id = String(event.queryStringParameters?.id || '').trim();
      if (!id) return json({ error: 'id query required' }, 400);
      const { data: existing } = await supabase.from('finance_staff').select('id').eq('id', id).maybeSingle();
      if (!existing) return json({ error: 'Staff record not found' }, 404);
      const { error } = await supabase.from('finance_staff').delete().eq('id', id);
      if (error) return json({ error: error.message || 'Staff delete failed' }, 500);
      await writeAudit(supabase, username, 'delete', 'finance_staff', id, null);
      return json({ ok: true });
    }
  }

  // --- READ: subscriptions ---
  if (event.httpMethod === 'GET' && resource === 'subscriptions') {
    const { data, error } = await supabase
      .from('finance_recurring_subscriptions')
      .select('*')
      .order('name', { ascending: true });
    if (error) return json({ error: error.message || 'Subscriptions query failed' }, 500);
    return json({ items: data || [] });
  }

  // --- WRITE: subscriptions ---
  if (resource === 'subscriptions' && event.httpMethod !== 'GET') {
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);

    if (event.httpMethod === 'POST') {
      let body;
      try { body = JSON.parse(event.body || '{}'); } catch (_) { return json({ error: 'Invalid JSON' }, 400); }
      const name = String(body.name || '').trim();
      const start_date = normalizeDate(body.start_date);
      const amount_egp = body.amount_egp == null ? NaN : Number(body.amount_egp);
      const cycle = String(body.cycle || 'monthly').trim().toLowerCase();
      const direction = String(body.direction || 'payable').trim().toLowerCase();
      const status = String(body.status || 'active').trim().toLowerCase();
      if (!name) return json({ error: 'name required' }, 400);
      if (!start_date) return json({ error: 'start_date required' }, 400);
      if (Number.isNaN(amount_egp) || amount_egp <= 0) return json({ error: 'positive amount_egp required' }, 400);
      if (!['monthly', 'quarterly', 'yearly'].includes(cycle)) return json({ error: 'invalid cycle' }, 400);
      if (!['payable', 'receivable'].includes(direction)) return json({ error: 'invalid direction' }, 400);
      if (!['active', 'paused', 'cancelled'].includes(status)) return json({ error: 'invalid status' }, 400);

      const today = new Date().toISOString().slice(0, 10);
      let next_billing_date = body.next_billing_date ? normalizeDate(body.next_billing_date) : null;
      if (!next_billing_date) next_billing_date = nextBillingOnOrAfter(start_date, cycle, today);

      const row = {
        name,
        direction,
        amount_egp,
        cycle,
        start_date,
        next_billing_date,
        end_date: body.end_date ? normalizeDate(body.end_date) : null,
        status,
        notes: body.notes != null ? String(body.notes).trim() : null,
        created_by: username,
      };
      const { data: inserted, error } = await supabase.from('finance_recurring_subscriptions').insert(row).select('*').single();
      if (error) return json({ error: error.message || 'Subscription insert failed' }, 500);
      await writeAudit(supabase, username, 'insert', 'finance_recurring_subscriptions', inserted.id, { name: name.slice(0, 80), cycle });
      return json({ ok: true, item: inserted });
    }

    if (event.httpMethod === 'PUT') {
      let body;
      try { body = JSON.parse(event.body || '{}'); } catch (_) { return json({ error: 'Invalid JSON' }, 400); }
      const id = String(body.id || '').trim();
      if (!id) return json({ error: 'id required' }, 400);
      const { data: existing } = await supabase.from('finance_recurring_subscriptions').select('id').eq('id', id).maybeSingle();
      if (!existing) return json({ error: 'Subscription not found' }, 404);
      const updates = { updated_at: new Date().toISOString() };
      if (body.name !== undefined) updates.name = String(body.name).trim();
      if (body.direction !== undefined) {
        const d = String(body.direction).trim().toLowerCase();
        if (!['payable', 'receivable'].includes(d)) return json({ error: 'invalid direction' }, 400);
        updates.direction = d;
      }
      if (body.amount_egp !== undefined) {
        const v = Number(body.amount_egp);
        if (Number.isNaN(v) || v <= 0) return json({ error: 'positive amount_egp required' }, 400);
        updates.amount_egp = v;
      }
      if (body.cycle !== undefined) {
        const c = String(body.cycle).trim().toLowerCase();
        if (!['monthly', 'quarterly', 'yearly'].includes(c)) return json({ error: 'invalid cycle' }, 400);
        updates.cycle = c;
      }
      if (body.start_date !== undefined) updates.start_date = body.start_date ? normalizeDate(body.start_date) : null;
      if (body.next_billing_date !== undefined) {
        updates.next_billing_date = body.next_billing_date ? normalizeDate(body.next_billing_date) : null;
      }
      if (body.end_date !== undefined) updates.end_date = body.end_date ? normalizeDate(body.end_date) : null;
      if (body.status !== undefined) {
        const st = String(body.status).trim().toLowerCase();
        if (!['active', 'paused', 'cancelled'].includes(st)) return json({ error: 'invalid status' }, 400);
        updates.status = st;
      }
      if (body.notes !== undefined) updates.notes = body.notes ? String(body.notes).trim() : null;
      const { data: updated, error } = await supabase.from('finance_recurring_subscriptions').update(updates).eq('id', id).select('*').single();
      if (error) return json({ error: error.message || 'Subscription update failed' }, 500);
      await writeAudit(supabase, username, 'update', 'finance_recurring_subscriptions', id, updates);
      return json({ ok: true, item: updated });
    }

    if (event.httpMethod === 'DELETE') {
      const id = String(event.queryStringParameters?.id || '').trim();
      if (!id) return json({ error: 'id query required' }, 400);
      const { data: existing } = await supabase.from('finance_recurring_subscriptions').select('id').eq('id', id).maybeSingle();
      if (!existing) return json({ error: 'Subscription not found' }, 404);
      const { error } = await supabase.from('finance_recurring_subscriptions').delete().eq('id', id);
      if (error) return json({ error: error.message || 'Subscription delete failed' }, 500);
      await writeAudit(supabase, username, 'delete', 'finance_recurring_subscriptions', id, null);
      return json({ ok: true });
    }
  }

  // --- WRITE: receipt (issue a cash receipt) ---
  if (resource === 'receipt' && event.httpMethod === 'POST') {
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch (_) { return json({ error: 'Invalid JSON' }, 400); }
    const amount = body.amount == null ? NaN : Number(body.amount);
    if (Number.isNaN(amount) || amount <= 0) return json({ error: 'Positive amount required' }, 400);

    // Optionally link to an enrollment
    let enrollmentUuid = null;
    let batchId = null;
    if (body.enrollment_id) {
      const { data: en } = await supabase.from('enrollments').select('id, batch_id').eq('enrollment_id', String(body.enrollment_id).trim()).maybeSingle();
      if (!en) return json({ error: 'Enrollment not found' }, 400);
      enrollmentUuid = en.id;
      batchId = en.batch_id;
    }

    // Generate serial number
    const { data: serialData, error: seqErr } = await supabase.rpc('next_receipt_serial');
    if (seqErr || !serialData) return json({ error: 'Could not generate receipt serial' }, 500);

    const row = {
      serial_number: serialData,
      payment_id: body.payment_id || null,
      enrollment_uuid: enrollmentUuid,
      amount,
      currency: String(body.currency || 'EGP').trim() || 'EGP',
      payer_name: body.payer_name ? String(body.payer_name).trim() : null,
      payer_address: body.payer_address ? String(body.payer_address).trim() : null,
      method: String(body.method || 'cash').trim(),
      cheque_number: body.cheque_number ? String(body.cheque_number).trim() : null,
      cheque_date: body.cheque_date ? normalizeDate(body.cheque_date) : null,
      notes: body.notes ? String(body.notes).trim() : null,
      issued_by: username,
      issued_at: body.issued_at ? new Date(String(body.issued_at)).toISOString() : new Date().toISOString(),
    };

    const { data: inserted, error } = await supabase.from('cash_receipts').insert(row).select('*').single();
    if (error) return json({ error: error.message || 'Receipt insert failed' }, 500);
    await writeAudit(supabase, username, 'insert', 'cash_receipt', inserted.id, { serial: serialData, amount });
    return json({ ok: true, item: inserted });
  }

  // --- WRITE: invoices ---
  if (resource === 'invoices' && event.httpMethod === 'POST') {
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch (_) { return json({ error: 'Invalid JSON' }, 400); }
    const invoice_number = String(body.invoice_number || '').trim();
    const issue_date = normalizeDate(body.issue_date) || new Date().toISOString().slice(0, 10);
    if (!invoice_number) return json({ error: 'invoice_number required' }, 400);

    const invRow = {
      company_id: body.company_id || null,
      invoice_number,
      issue_date,
      due_date: normalizeDate(body.due_date),
      status: String(body.status || 'draft').trim(),
      subtotal: body.subtotal != null ? Number(body.subtotal) : null,
      tax_amount: body.tax_amount != null ? Number(body.tax_amount) : null,
      total: body.total != null ? Number(body.total) : null,
      currency: String(body.currency || 'EGP').trim(),
      notes: body.notes != null ? String(body.notes).trim() : null,
      updated_at: new Date().toISOString(),
    };

    const { data: inv, error } = await supabase.from('invoices').insert(invRow).select('*').single();
    if (error) return json({ error: error.message || 'Invoice create failed' }, 500);
    await writeAudit(supabase, username, 'insert', 'invoice', inv.id, { invoice_number });

    const lines = Array.isArray(body.lines) ? body.lines : [];
    for (const line of lines) {
      await supabase.from('invoice_lines').insert({
        invoice_id: inv.id,
        enrollment_uuid: line.enrollment_uuid || null,
        description: line.description != null ? String(line.description) : null,
        quantity: line.quantity != null ? Number(line.quantity) : 1,
        unit_price: line.unit_price != null ? Number(line.unit_price) : null,
        line_total: line.line_total != null ? Number(line.line_total) : null,
      });
    }
    if (lines.length) await writeAudit(supabase, username, 'insert', 'invoice_lines', inv.id, { count: lines.length });
    return json({ ok: true, item: inv });
  }

  if (resource === 'invoices' && event.httpMethod === 'PUT') {
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    let body;
    try { body = JSON.parse(event.body || '{}'); } catch (_) { return json({ error: 'Invalid JSON' }, 400); }
    const id = String(body.id || '').trim();
    if (!id) return json({ error: 'id required' }, 400);
    const invRow = {
      company_id: body.company_id === undefined ? undefined : body.company_id || null,
      invoice_number: body.invoice_number != null ? String(body.invoice_number).trim() : undefined,
      issue_date: body.issue_date != null ? normalizeDate(body.issue_date) : undefined,
      due_date: body.due_date !== undefined ? normalizeDate(body.due_date) : undefined,
      status: body.status != null ? String(body.status).trim() : undefined,
      subtotal: body.subtotal !== undefined ? Number(body.subtotal) : undefined,
      tax_amount: body.tax_amount !== undefined ? Number(body.tax_amount) : undefined,
      total: body.total !== undefined ? Number(body.total) : undefined,
      currency: body.currency != null ? String(body.currency).trim() : undefined,
      notes: body.notes !== undefined ? String(body.notes).trim() : undefined,
      updated_at: new Date().toISOString(),
    };
    Object.keys(invRow).forEach((k) => invRow[k] === undefined && delete invRow[k]);
    const { data: inv, error } = await supabase.from('invoices').update(invRow).eq('id', id).select('*').single();
    if (error) return json({ error: error.message || 'Invoice update failed' }, 500);
    await writeAudit(supabase, username, 'update', 'invoice', id, invRow);
    if (Array.isArray(body.lines)) {
      const { error: delErr } = await supabase.from('invoice_lines').delete().eq('invoice_id', id);
      if (delErr) return json({ error: delErr.message || 'Could not replace invoice lines' }, 500);
      for (const line of body.lines) {
        await supabase.from('invoice_lines').insert({
          invoice_id: id,
          enrollment_uuid: line.enrollment_uuid || null,
          description: line.description != null ? String(line.description) : null,
          quantity: line.quantity != null ? Number(line.quantity) : 1,
          unit_price: line.unit_price != null ? Number(line.unit_price) : null,
          line_total: line.line_total != null ? Number(line.line_total) : null,
        });
      }
      await writeAudit(supabase, username, 'replace_lines', 'invoice', id, { line_count: body.lines.length });
    }
    return json({ ok: true, item: inv });
  }

  if (resource === 'invoices' && event.httpMethod === 'DELETE') {
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    const id = String(event.queryStringParameters?.id || '').trim();
    if (!id) return json({ error: 'id query required' }, 400);
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) return json({ error: error.message || 'Invoice delete failed' }, 500);
    await writeAudit(supabase, username, 'delete', 'invoice', id, null);
    return json({ ok: true });
  }

  if (event.httpMethod === 'GET' && resource === 'companies') {
    const { data, error } = await supabase.from('companies').select('*').order('name', { ascending: true }).limit(500);
    if (error) return json({ error: error.message || 'Could not load companies' }, 500);
    return json({ items: data || [] });
  }

  if (event.httpMethod === 'GET' && resource === 'audit') {
    if (role !== 'admin') return json({ error: 'Forbidden' }, 403);
    const { page, pageSize, from, to } = parsePage(event.queryStringParameters || {});
    const { data, error, count } = await supabase
      .from('finance_audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) return json({ error: error.message || 'Audit query failed' }, 500);
    return json({ items: data || [], total: count != null ? count : 0, page, pageSize });
  }

  return json({ error: 'Unknown resource or method' }, 400);
};
