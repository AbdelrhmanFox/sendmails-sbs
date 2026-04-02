const { cors, json, getSupabaseServiceClient, verifyAuth, normalizeDate } = require('../lib/_shared');

const ENTITY_CONFIG = {
  trainees: {
    table: 'trainees',
    idKey: 'id',
    required: ['trainee_id'],
    normalize: (b) => ({
      trainee_id: String(b.trainee_id || '').trim(),
      full_name: String(b.full_name || '').trim() || null,
      email: String(b.email || '').trim() || null,
      phone: String(b.phone || '').trim() || null,
      trainee_type: String(b.trainee_type || '').trim() || null,
      company_name: String(b.company_name || '').trim() || null,
      job_title: String(b.job_title || '').trim() || null,
      university: String(b.university || '').trim() || null,
      specialty: String(b.specialty || '').trim() || null,
      city: String(b.city || '').trim() || null,
      created_date: normalizeDate(b.created_date),
      status: String(b.status || 'Active').trim(),
      notes: String(b.notes || '').trim() || null,
      updated_at: new Date().toISOString(),
    }),
  },
  courses: {
    table: 'courses',
    idKey: 'id',
    required: ['course_id', 'course_name'],
    normalize: (b) => ({
      course_id: String(b.course_id || '').trim(),
      course_name: String(b.course_name || '').trim(),
      category: String(b.category || '').trim() || null,
      target_audience: String(b.target_audience || '').trim() || null,
      duration_hours: b.duration_hours === '' || b.duration_hours == null ? null : Number(b.duration_hours),
      delivery_type: String(b.delivery_type || '').trim() || null,
      price: b.price === '' || b.price == null ? null : Number(b.price),
      description: String(b.description || '').trim() || null,
      status: String(b.status || 'Active').trim(),
      updated_at: new Date().toISOString(),
    }),
  },
  batches: {
    table: 'batches',
    idKey: 'id',
    required: ['batch_id'],
    normalize: (b) => ({
      batch_id: String(b.batch_id || '').trim(),
      course_id: String(b.course_id || '').trim() || null,
      batch_name: String(b.batch_name || '').trim() || null,
      trainer: String(b.trainer || '').trim() || null,
      location: String(b.location || '').trim() || null,
      capacity: b.capacity === '' || b.capacity == null ? null : Number(b.capacity),
      start_date: normalizeDate(b.start_date),
      end_date: normalizeDate(b.end_date),
      updated_at: new Date().toISOString(),
    }),
  },
  enrollments: {
    table: 'enrollments',
    idKey: 'id',
    required: ['enrollment_id', 'trainee_id', 'batch_id'],
    normalize: (b) => ({
      enrollment_id: String(b.enrollment_id || '').trim(),
      trainee_id: String(b.trainee_id || '').trim(),
      batch_id: String(b.batch_id || '').trim(),
      enrollment_status: String(b.enrollment_status || 'Registered').trim(),
      payment_status: String(b.payment_status || 'Pending').trim(),
      amount_paid: b.amount_paid === '' || b.amount_paid == null ? null : Number(b.amount_paid),
      certificate_issued: b.certificate_issued === '' || b.certificate_issued == null ? null : Boolean(b.certificate_issued),
      enroll_date: normalizeDate(b.enroll_date),
      notes: String(b.notes || '').trim() || null,
      updated_at: new Date().toISOString(),
    }),
  },
};

function requireFields(payload, fields) {
  const missing = fields.filter((f) => payload[f] == null || payload[f] === '');
  return missing;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(event.httpMethod)) return json({ error: 'Method not allowed' }, 405);

  const auth = verifyAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  if (!['admin', 'staff', 'trainer', 'user'].includes(auth.role)) return json({ error: 'Forbidden' }, 403);

  const entity = String(event.queryStringParameters?.entity || '').trim().toLowerCase();
  const cfg = ENTITY_CONFIG[entity];
  if (!cfg) return json({ error: 'Unknown entity' }, 400);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  if (event.httpMethod === 'GET') {
    const { data, error } = await supabase.from(cfg.table).select('*').order('created_at', { ascending: false }).limit(300);
    if (error) return json({ error: error.message || 'Could not load data' }, 500);
    return json({ items: data || [] });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (event.httpMethod === 'POST') {
    const payload = cfg.normalize(body);
    const missing = requireFields(payload, cfg.required);
    if (missing.length) return json({ error: `Missing required fields: ${missing.join(', ')}` }, 400);
    const { data, error } = await supabase.from(cfg.table).insert(payload).select('*').single();
    if (error) return json({ error: error.message || 'Insert failed' }, 500);
    return json({ ok: true, item: data });
  }

  if (event.httpMethod === 'PUT') {
    const id = String(body[cfg.idKey] || '').trim();
    if (!id) return json({ error: `${cfg.idKey} is required` }, 400);
    const payload = cfg.normalize(body);
    const missing = requireFields(payload, cfg.required);
    if (missing.length) return json({ error: `Missing required fields: ${missing.join(', ')}` }, 400);
    const { data, error } = await supabase.from(cfg.table).update(payload).eq(cfg.idKey, id).select('*').single();
    if (error) return json({ error: error.message || 'Update failed' }, 500);
    return json({ ok: true, item: data });
  }

  const id = String(event.queryStringParameters?.id || '').trim();
  if (!id) return json({ error: 'id query parameter is required' }, 400);
  const { error } = await supabase.from(cfg.table).delete().eq(cfg.idKey, id);
  if (error) return json({ error: error.message || 'Delete failed' }, 500);
  return json({ ok: true });
};
