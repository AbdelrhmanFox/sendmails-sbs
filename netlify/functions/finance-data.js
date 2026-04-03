const { cors, json, getSupabaseServiceClient, verifyAuth, normalizeDate, trimEnvValue } = require('../lib/_shared');

const READ_ROLES = ['admin', 'accountant', 'staff'];
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

  if (event.httpMethod === 'GET' && resource === 'kpis') {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const { data: paymentsMtd } = await supabase.from('payments').select('amount').gte('received_at', startOfMonth);
    const mtd_revenue = (paymentsMtd || []).reduce((s, p) => s + Number(p.amount || 0), 0);

    const { data: invs } = await supabase.from('invoices').select('total, status');
    const closed = new Set(['paid', 'void', 'draft']);
    const outstanding = (invs || [])
      .filter((i) => !closed.has(String(i.status || '').toLowerCase()))
      .reduce((s, i) => s + Number(i.total || 0), 0);

    const { count: payment_count } = await supabase.from('payments').select('*', { count: 'exact', head: true });

    return json({
      mtd_revenue,
      outstanding_invoices: outstanding,
      payment_count: payment_count || 0,
    });
  }

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
      if (Object.prototype.hasOwnProperty.call(byMonth, key)) {
        byMonth[key] += Number(p.amount || 0);
      }
    });
    const values = keys.map((k) => byMonth[k] || 0);
    const labels = keys.map((k) => {
      const [, m] = k.split('-');
      const y = k.split('-')[0];
      return `${monthNames[parseInt(m, 10) - 1]} ${y}`;
    });
    return json({ currency: 'EGP', labels, values });
  }

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
    let labels;
    let values;
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
      .select(
        'id, amount, currency, method, received_at, reference, status, notes, created_by, created_at, enrollment_uuid, enrollments ( enrollment_id, trainee_id, batch_id )',
        { count: 'exact' },
      )
      .order('received_at', { ascending: false });

    if (enrollmentUuid) q = q.eq('enrollment_uuid', enrollmentUuid);
    if (fromDate) q = q.gte('received_at', `${fromDate}T00:00:00.000Z`);
    if (toDate) q = q.lte('received_at', `${toDate}T23:59:59.999Z`);
    if (method) q = q.ilike('method', `%${method}%`);

    const { data: rows, error, count } = await q.range(from, to);
    if (error) return json({ error: error.message || 'Ledger query failed' }, 500);

    return json({
      items: rows || [],
      total: count != null ? count : (rows || []).length,
      page,
      pageSize,
    });
  }

  if (event.httpMethod === 'GET' && resource === 'ar-aging') {
    const asOfStr = event.queryStringParameters?.as_of ? normalizeDate(event.queryStringParameters.as_of) : null;
    const asOf = asOfStr ? new Date(asOfStr + 'T12:00:00Z') : new Date();
    const { data: invsRaw, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, due_date, total, status, company_id')
      .limit(2000);
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

  if (event.httpMethod === 'GET' && resource === 'invoices') {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, companies ( id, name ), invoice_lines ( id, description, line_total, enrollment_uuid )')
      .order('issue_date', { ascending: false })
      .limit(200);
    if (error) return json({ error: error.message || 'Could not load invoices' }, 500);
    return json({ items: data || [] });
  }

  if (event.httpMethod === 'POST' && resource === 'payment') {
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (_) {
      return json({ error: 'Invalid JSON' }, 400);
    }
    const enrollmentKey = String(body.enrollment_id || '').trim();
    const amount = body.amount === '' || body.amount == null ? NaN : Number(body.amount);
    if (!enrollmentKey || Number.isNaN(amount)) return json({ error: 'enrollment_id and amount required' }, 400);
    const methodNorm = String(body.method || '').trim().toLowerCase();
    if (amount < 0 && methodNorm !== 'refund') {
      return json({ error: 'Negative amounts are only allowed when method is "refund"' }, 400);
    }

    const { data: en, error: enErr } = await supabase.from('enrollments').select('id').eq('enrollment_id', enrollmentKey).maybeSingle();
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
      created_by: String(auth.username || auth.sub || 'user'),
    };

    const { data: inserted, error } = await supabase.from('payments').insert(row).select('*').single();
    if (error) return json({ error: error.message || 'Payment insert failed' }, 500);
    await writeAudit(supabase, row.created_by, 'insert', 'payment', inserted.id, { amount, enrollment_id: enrollmentKey, method: row.method });
    return json({ ok: true, item: inserted });
  }

  if (resource === 'invoices' && event.httpMethod === 'POST') {
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (_) {
      return json({ error: 'Invalid JSON' }, 400);
    }
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
    await writeAudit(supabase, String(auth.username || 'user'), 'insert', 'invoice', inv.id, { invoice_number });

    const lines = Array.isArray(body.lines) ? body.lines : [];
    for (const line of lines) {
      const lr = {
        invoice_id: inv.id,
        enrollment_uuid: line.enrollment_uuid || null,
        description: line.description != null ? String(line.description) : null,
        quantity: line.quantity != null ? Number(line.quantity) : 1,
        unit_price: line.unit_price != null ? Number(line.unit_price) : null,
        line_total: line.line_total != null ? Number(line.line_total) : null,
      };
      await supabase.from('invoice_lines').insert(lr);
    }
    if (lines.length) {
      await writeAudit(supabase, String(auth.username || 'user'), 'insert', 'invoice_lines', inv.id, { count: lines.length });
    }

    return json({ ok: true, item: inv });
  }

  if (resource === 'invoices' && event.httpMethod === 'PUT') {
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (_) {
      return json({ error: 'Invalid JSON' }, 400);
    }
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
    await writeAudit(supabase, String(auth.username || 'user'), 'update', 'invoice', id, invRow);

    if (Array.isArray(body.lines)) {
      const { error: delErr } = await supabase.from('invoice_lines').delete().eq('invoice_id', id);
      if (delErr) return json({ error: delErr.message || 'Could not replace invoice lines' }, 500);
      for (const line of body.lines) {
        const lr = {
          invoice_id: id,
          enrollment_uuid: line.enrollment_uuid || null,
          description: line.description != null ? String(line.description) : null,
          quantity: line.quantity != null ? Number(line.quantity) : 1,
          unit_price: line.unit_price != null ? Number(line.unit_price) : null,
          line_total: line.line_total != null ? Number(line.line_total) : null,
        };
        await supabase.from('invoice_lines').insert(lr);
      }
      await writeAudit(supabase, String(auth.username || 'user'), 'replace_lines', 'invoice', id, { line_count: body.lines.length });
    }

    return json({ ok: true, item: inv });
  }

  if (resource === 'invoices' && event.httpMethod === 'DELETE') {
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    const id = String(event.queryStringParameters?.id || '').trim();
    if (!id) return json({ error: 'id query required' }, 400);
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) return json({ error: error.message || 'Invoice delete failed' }, 500);
    await writeAudit(supabase, String(auth.username || 'user'), 'delete', 'invoice', id, null);
    return json({ ok: true });
  }

  if (event.httpMethod === 'GET' && resource === 'companies') {
    const { data, error } = await supabase.from('companies').select('*').order('name', { ascending: true }).limit(500);
    if (error) return json({ error: error.message || 'Could not load companies' }, 500);
    return json({ items: data || [] });
  }

  if (event.httpMethod === 'GET' && resource === 'audit') {
    if (auth.role !== 'admin') return json({ error: 'Forbidden' }, 403);
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
