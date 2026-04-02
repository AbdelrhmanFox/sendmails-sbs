const { cors, json, getSupabaseServiceClient, verifyAuth, normalizeDate } = require('./_shared');

function mapRow(row) {
  return {
    id: row.id,
    enrollmentId: row.enrollment_id,
    traineeId: row.trainee_id,
    batchId: row.batch_id,
    enrollmentStatus: row.enrollment_status,
    paymentStatus: row.payment_status,
    amountPaid: row.amount_paid,
    certificateIssued: row.certificate_issued,
    enrollDate: row.enroll_date,
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(event.httpMethod)) return json({ error: 'Method not allowed' }, 405);

  const auth = verifyAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  if (!['admin', 'staff', 'trainer', 'user'].includes(auth.role)) return json({ error: 'Forbidden' }, 403);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  if (event.httpMethod === 'GET') {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) return json({ error: 'Could not load enrollments' }, 500);
    return json({ items: (data || []).map(mapRow) });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (event.httpMethod === 'POST') {
    const payload = {
      enrollment_id: String(body.enrollmentId || '').trim(),
      trainee_id: String(body.traineeId || '').trim(),
      batch_id: String(body.batchId || '').trim(),
      enrollment_status: String(body.enrollmentStatus || 'Registered').trim(),
      payment_status: String(body.paymentStatus || 'Pending').trim(),
      amount_paid: body.amountPaid === '' || body.amountPaid == null ? null : Number(body.amountPaid),
      certificate_issued: body.certificateIssued === '' || body.certificateIssued == null ? null : Boolean(body.certificateIssued),
      enroll_date: normalizeDate(body.enrollDate),
      notes: String(body.notes || '').trim(),
    };
    if (!payload.enrollment_id || !payload.trainee_id || !payload.batch_id) return json({ error: 'Missing required fields' }, 400);
    if (payload.amount_paid != null && Number.isNaN(payload.amount_paid)) return json({ error: 'Invalid amount' }, 400);
    const { data, error } = await supabase.from('enrollments').insert(payload).select('*').single();
    if (error) return json({ error: error.message || 'Could not create enrollment' }, 500);
    return json({ ok: true, item: mapRow(data) });
  }

  if (event.httpMethod === 'PUT') {
    const id = String(body.id || '').trim();
    if (!id) return json({ error: 'id is required' }, 400);
    const payload = {
      enrollment_id: String(body.enrollmentId || '').trim(),
      trainee_id: String(body.traineeId || '').trim(),
      batch_id: String(body.batchId || '').trim(),
      enrollment_status: String(body.enrollmentStatus || 'Registered').trim(),
      payment_status: String(body.paymentStatus || 'Pending').trim(),
      amount_paid: body.amountPaid === '' || body.amountPaid == null ? null : Number(body.amountPaid),
      certificate_issued: body.certificateIssued === '' || body.certificateIssued == null ? null : Boolean(body.certificateIssued),
      enroll_date: normalizeDate(body.enrollDate),
      notes: String(body.notes || '').trim(),
      updated_at: new Date().toISOString(),
    };
    if (!payload.enrollment_id || !payload.trainee_id || !payload.batch_id) return json({ error: 'Missing required fields' }, 400);
    if (payload.amount_paid != null && Number.isNaN(payload.amount_paid)) return json({ error: 'Invalid amount' }, 400);
    const { data, error } = await supabase.from('enrollments').update(payload).eq('id', id).select('*').single();
    if (error) return json({ error: error.message || 'Could not update enrollment' }, 500);
    return json({ ok: true, item: mapRow(data) });
  }

  const id = event.queryStringParameters?.id;
  if (!id) return json({ error: 'id query parameter is required' }, 400);
  const { error } = await supabase.from('enrollments').delete().eq('id', id);
  if (error) return json({ error: error.message || 'Could not delete enrollment' }, 500);
  return json({ ok: true });
};
