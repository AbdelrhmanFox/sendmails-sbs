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

/**
 * Returns null for admin (no filter) or an array of allowed batch_ids for accountants.
 * An empty array means the accountant has no assigned batches.
 */
async function resolveAllowedBatches(supabase, username, role) {
  if (role === 'admin') return null;
  const { data, error } = await supabase
    .from('finance_user_batch_access')
    .select('batch_id')
    .eq('username', username);
  if (error) return [];
  return (data || []).map((r) => r.batch_id);
}

/**
 * Resolves enrollment UUIDs scoped to the allowed batch list.
 * Returns null when no scoping is needed (admin).
 * Returns an empty array when an accountant has no batches — callers should short-circuit.
 */
async function getScopedEnrollmentUuids(supabase, allowedBatches) {
  if (allowedBatches === null) return null;
  if (allowedBatches.length === 0) return [];
  const { data } = await supabase.from('enrollments').select('id').in('batch_id', allowedBatches);
  return (data || []).map((r) => r.id);
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
  const allowedBatches = await resolveAllowedBatches(supabase, username, role);

  // Accountant with zero assigned batches gets an explicit empty response.
  const isScoped = allowedBatches !== null;
  const noAccess = isScoped && allowedBatches.length === 0;

  // --- READ: my-batches ---
  if (event.httpMethod === 'GET' && resource === 'my-batches') {
    if (allowedBatches === null) {
      const { data } = await supabase.from('batches').select('batch_id, batch_name, course_id').order('batch_id');
      return json({ items: data || [] });
    }
    if (allowedBatches.length === 0) return json({ items: [] });
    const { data } = await supabase
      .from('batches')
      .select('batch_id, batch_name, course_id')
      .in('batch_id', allowedBatches)
      .order('batch_id');
    return json({ items: data || [] });
  }

  // --- ADMIN: finance-access CRUD ---
  if (resource === 'finance-access') {
    if (role !== 'admin') return json({ error: 'Forbidden' }, 403);

    if (event.httpMethod === 'GET') {
      const filterUser = String(event.queryStringParameters?.username || '').trim();
      let q = supabase.from('finance_user_batch_access').select('*').order('username').order('batch_id');
      if (filterUser) q = q.eq('username', filterUser);
      const { data, error } = await q;
      if (error) return json({ error: error.message || 'Query failed' }, 500);
      return json({ items: data || [] });
    }

    if (event.httpMethod === 'POST') {
      let body;
      try { body = JSON.parse(event.body || '{}'); } catch (_) { return json({ error: 'Invalid JSON' }, 400); }
      const un = String(body.username || '').trim();
      const bid = String(body.batch_id || '').trim();
      if (!un || !bid) return json({ error: 'username and batch_id required' }, 400);
      const { data: row, error } = await supabase
        .from('finance_user_batch_access')
        .insert({ username: un, batch_id: bid, created_by: username })
        .select('*')
        .single();
      if (error) return json({ error: error.message || 'Insert failed' }, 500);
      await writeAudit(supabase, username, 'grant_finance_access', 'finance_user_batch_access', row.id, { un, bid });
      return json({ ok: true, item: row });
    }

    if (event.httpMethod === 'DELETE') {
      const id = String(event.queryStringParameters?.id || '').trim();
      if (!id) return json({ error: 'id query required' }, 400);
      const { error } = await supabase.from('finance_user_batch_access').delete().eq('id', id);
      if (error) return json({ error: error.message || 'Delete failed' }, 500);
      await writeAudit(supabase, username, 'revoke_finance_access', 'finance_user_batch_access', id, null);
      return json({ ok: true });
    }
  }

  // --- READ: KPIs ---
  if (event.httpMethod === 'GET' && resource === 'kpis') {
    if (noAccess) return json({ mtd_revenue: 0, outstanding_invoices: 0, payment_count: 0 });
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    let scopedUuids = await getScopedEnrollmentUuids(supabase, allowedBatches);
    if (scopedUuids !== null && scopedUuids.length === 0) {
      return json({ mtd_revenue: 0, outstanding_invoices: 0, payment_count: 0 });
    }

    let payMtdQ = supabase.from('payments').select('amount').gte('received_at', startOfMonth);
    let payCountQ = supabase.from('payments').select('*', { count: 'exact', head: true });
    if (scopedUuids) {
      payMtdQ = payMtdQ.in('enrollment_uuid', scopedUuids);
      payCountQ = payCountQ.in('enrollment_uuid', scopedUuids);
    }
    const [{ data: paymentsMtd }, { count: payment_count }] = await Promise.all([payMtdQ, payCountQ]);
    const mtd_revenue = (paymentsMtd || []).reduce((s, p) => s + Number(p.amount || 0), 0);

    // Invoices: company-level, show org-wide to all finance readers.
    const { data: invs } = await supabase.from('invoices').select('total, status');
    const closed = new Set(['paid', 'void', 'draft']);
    const outstanding = (invs || [])
      .filter((i) => !closed.has(String(i.status || '').toLowerCase()))
      .reduce((s, i) => s + Number(i.total || 0), 0);

    return json({ mtd_revenue, outstanding_invoices: outstanding, payment_count: payment_count || 0 });
  }

  // --- READ: chart-revenue-trend ---
  if (event.httpMethod === 'GET' && resource === 'chart-revenue-trend') {
    if (noAccess) return json({ currency: 'EGP', labels: [], values: [] });
    const months = Math.min(24, Math.max(3, parseInt(String(event.queryStringParameters?.months || '6'), 10) || 6));
    const today = new Date();
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (months - 1), 1));
    const startIso = start.toISOString();

    let scopedUuids = await getScopedEnrollmentUuids(supabase, allowedBatches);
    if (scopedUuids !== null && scopedUuids.length === 0) return json({ currency: 'EGP', labels: [], values: [] });

    let q = supabase.from('payments').select('amount, received_at').gte('received_at', startIso);
    if (scopedUuids) q = q.in('enrollment_uuid', scopedUuids);
    const { data: payments, error } = await q;
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
    if (noAccess) return json({ currency: 'EGP', labels: [], values: [] });
    const days = Math.min(365, Math.max(30, parseInt(String(event.queryStringParameters?.days || '90'), 10) || 90));
    const start = new Date(Date.now() - days * 864e5).toISOString();

    let scopedUuids = await getScopedEnrollmentUuids(supabase, allowedBatches);
    if (scopedUuids !== null && scopedUuids.length === 0) return json({ currency: 'EGP', labels: [], values: [] });

    let q = supabase.from('payments').select('amount, method').gte('received_at', start);
    if (scopedUuids) q = q.in('enrollment_uuid', scopedUuids);
    const { data: payments, error } = await q;
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
    if (noAccess) return json({ currency: 'EGP', labels: [], values: [] });
    const days = Math.min(730, Math.max(30, parseInt(String(event.queryStringParameters?.days || '365'), 10) || 365));
    const start = new Date(Date.now() - days * 864e5).toISOString();

    let scopedUuids = await getScopedEnrollmentUuids(supabase, allowedBatches);
    if (scopedUuids !== null && scopedUuids.length === 0) return json({ currency: 'EGP', labels: [], values: [] });

    let q = supabase.from('payments').select('amount, enrollments ( trainee_id )').gte('received_at', start);
    if (scopedUuids) q = q.in('enrollment_uuid', scopedUuids);
    const { data: pay, error } = await q;
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
    if (noAccess) return json({ items: [], total: 0, page: 1, pageSize: 50 });
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

    if (enrollmentUuid) {
      q = q.eq('enrollment_uuid', enrollmentUuid);
    } else if (isScoped) {
      const scopedUuids = await getScopedEnrollmentUuids(supabase, allowedBatches);
      if (scopedUuids !== null && scopedUuids.length === 0) return json({ items: [], total: 0, page, pageSize });
      if (scopedUuids) q = q.in('enrollment_uuid', scopedUuids);
    }
    if (fromDate) q = q.gte('received_at', `${fromDate}T00:00:00.000Z`);
    if (toDate) q = q.lte('received_at', `${toDate}T23:59:59.999Z`);
    if (method) q = q.ilike('method', `%${method}%`);

    const { data: rows, error, count } = await q.range(from, to);
    if (error) return json({ error: error.message || 'Ledger query failed' }, 500);
    return json({ items: rows || [], total: count != null ? count : (rows || []).length, page, pageSize });
  }

  // --- READ: receivables (workbook-shaped installment view per batch) ---
  if (event.httpMethod === 'GET' && resource === 'receivables') {
    if (noAccess) return json({ items: [], batch_id: null });
    const batchFilter = String(event.queryStringParameters?.batch_id || '').trim();

    // Validate batch access
    if (batchFilter && isScoped && !allowedBatches.includes(batchFilter)) {
      return json({ error: 'Forbidden' }, 403);
    }

    let q = supabase
      .from('enrollments')
      .select('id, enrollment_id, trainee_id, batch_id, payment_status, agreed_fee, amount_paid, trainees ( full_name ), batches ( course_id, courses ( price ) )')
      .order('trainee_id', { ascending: true });

    if (batchFilter) {
      q = q.eq('batch_id', batchFilter);
    } else if (isScoped) {
      q = q.in('batch_id', allowedBatches);
    }

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
    if (noAccess) return json({ income: [], expenses: [], currency: 'EGP' });
    const fromDate = event.queryStringParameters?.from ? normalizeDate(event.queryStringParameters.from) : null;
    const toDate = event.queryStringParameters?.to ? normalizeDate(event.queryStringParameters.to) : null;
    const batchFilter = String(event.queryStringParameters?.batch_id || '').trim();

    if (batchFilter && isScoped && !allowedBatches.includes(batchFilter)) return json({ error: 'Forbidden' }, 403);

    // Income side: scoped payments
    let scopedUuids = await getScopedEnrollmentUuids(supabase, allowedBatches);
    if (scopedUuids !== null && scopedUuids.length === 0) return json({ income: [], expenses: [], currency: 'EGP' });

    let incQ = supabase
      .from('payments')
      .select('id, amount, received_at, method, enrollments ( enrollment_id, trainee_id, batch_id, trainees ( full_name ) )')
      .order('received_at', { ascending: true })
      .limit(500);
    if (batchFilter) {
      // filter via batch
      const { data: batchEnvs } = await supabase.from('enrollments').select('id').eq('batch_id', batchFilter);
      const bids = (batchEnvs || []).map((e) => e.id);
      if (bids.length === 0) {
        incQ = null;
      } else {
        incQ = incQ.in('enrollment_uuid', bids);
      }
    } else if (scopedUuids) {
      incQ = incQ.in('enrollment_uuid', scopedUuids);
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
    if (batchFilter) {
      expQ = expQ.or(`batch_id.eq.${batchFilter},batch_id.is.null`);
    } else if (isScoped) {
      // Show batch-tagged expenses for allowed batches + org-wide (null) expenses
      expQ = expQ.or(`batch_id.in.(${allowedBatches.join(',')}),batch_id.is.null`);
    }
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
    if (noAccess) return json({ items: [], total: 0 });
    const { page, pageSize, from, to } = parsePage(event.queryStringParameters || {});
    let q = supabase
      .from('cash_receipts')
      .select('*, enrollments ( enrollment_id, batch_id, trainee_id )', { count: 'exact' })
      .order('issued_at', { ascending: false });

    if (isScoped) {
      const scopedUuids = await getScopedEnrollmentUuids(supabase, allowedBatches);
      if (scopedUuids !== null && scopedUuids.length === 0) return json({ items: [], total: 0 });
      if (scopedUuids) q = q.in('enrollment_uuid', scopedUuids);
    }

    const { data, error, count } = await q.range(from, to);
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

    // Scoped write check
    if (isScoped && !allowedBatches.includes(en.batch_id)) return json({ error: 'Forbidden' }, 403);

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
      if (batchId && isScoped && !allowedBatches.includes(batchId)) return json({ error: 'Forbidden' }, 403);

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

      // Check existing record access
      const { data: existing } = await supabase.from('finance_expenses').select('batch_id').eq('id', id).maybeSingle();
      if (!existing) return json({ error: 'Expense not found' }, 404);
      if (isScoped && existing.batch_id && !allowedBatches.includes(existing.batch_id)) return json({ error: 'Forbidden' }, 403);

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
      if (isScoped && existing.batch_id && !allowedBatches.includes(existing.batch_id)) return json({ error: 'Forbidden' }, 403);
      const { error } = await supabase.from('finance_expenses').delete().eq('id', id);
      if (error) return json({ error: error.message || 'Expense delete failed' }, 500);
      await writeAudit(supabase, username, 'delete', 'expense', id, null);
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
      if (isScoped && !allowedBatches.includes(en.batch_id)) return json({ error: 'Forbidden' }, 403);
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
