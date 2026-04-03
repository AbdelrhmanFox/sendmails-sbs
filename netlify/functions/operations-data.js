const { cors, json, getSupabaseServiceClient, verifyAuth, normalizeDate } = require('../lib/_shared');
const { coerceRow } = require('../lib/operations-import-map');

const UPSERT_CONFLICT = {
  trainees: 'trainee_id',
  courses: 'course_id',
  batches: 'batch_id',
  enrollments: 'enrollment_id',
};

const BULK_CHUNK = 75;

function parseCertificateIssued(v) {
  if (v === '' || v == null) return null;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (['yes', 'true', '1', 'y'].includes(s)) return true;
  if (['no', 'false', '0', 'n'].includes(s)) return false;
  return null;
}

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
      company_id: String(b.company_id || '').trim() || null,
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
      certificate_issued: parseCertificateIssued(b.certificate_issued),
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

async function handleOpsInsight(event, auth, supabase) {
  if (event.httpMethod !== 'GET') return json({ error: 'Method not allowed' }, 405);
  if (!['admin', 'staff', 'user'].includes(auth.role)) return json({ error: 'Forbidden' }, 403);

  const resource = String(event.queryStringParameters?.resource || '').trim().toLowerCase();

  if (resource === 'pipeline') {
    const { data: enrollments, error } = await supabase.from('enrollments').select('enrollment_status');
    if (error) return json({ error: error.message || 'Pipeline query failed' }, 500);
    const pipeline = {};
    (enrollments || []).forEach((e) => {
      const k = e.enrollment_status || 'Unknown';
      pipeline[k] = (pipeline[k] || 0) + 1;
    });
    return json({ pipeline, total: enrollments?.length || 0 });
  }

  if (resource === 'capacity') {
    const { data: batches, error: bErr } = await supabase.from('batches').select('batch_id, capacity, course_id');
    if (bErr) return json({ error: bErr.message || 'Capacity query failed' }, 500);
    const { data: ens, error: eErr } = await supabase.from('enrollments').select('batch_id');
    if (eErr) return json({ error: eErr.message || 'Capacity query failed' }, 500);
    const perBatch = {};
    (ens || []).forEach((e) => {
      const b = e.batch_id;
      if (!b) return;
      perBatch[b] = (perBatch[b] || 0) + 1;
    });
    const capacity = (batches || []).map((b) => {
      const enrolled = perBatch[b.batch_id] || 0;
      const cap = b.capacity != null ? Number(b.capacity) : null;
      return {
        batch_id: b.batch_id,
        course_id: b.course_id,
        capacity: cap,
        enrolled,
        utilization_pct: cap && cap > 0 ? Math.round((100 * enrolled) / cap) : null,
      };
    });
    return json({ capacity });
  }

  if (resource === 'data-quality') {
    const { data: trainees } = await supabase.from('trainees').select('trainee_id');
    const traineeSet = new Set((trainees || []).map((t) => t.trainee_id));
    const { data: batches } = await supabase.from('batches').select('batch_id');
    const batchSet = new Set((batches || []).map((b) => b.batch_id));
    const { data: ens } = await supabase.from('enrollments').select('enrollment_id, trainee_id, batch_id');

    const orphanTrainee = [];
    const orphanBatch = [];
    const idCounts = {};
    (ens || []).forEach((e) => {
      if (!traineeSet.has(e.trainee_id)) orphanTrainee.push(e.enrollment_id);
      if (!batchSet.has(e.batch_id)) orphanBatch.push(e.enrollment_id);
      const ek = e.enrollment_id;
      idCounts[ek] = (idCounts[ek] || 0) + 1;
    });
    const duplicateEnrollmentIds = Object.keys(idCounts).filter((k) => idCounts[k] > 1);

    return json({
      orphan_trainee_refs: orphanTrainee.length,
      orphan_batch_refs: orphanBatch.length,
      duplicate_enrollment_ids: duplicateEnrollmentIds.length,
      samples: {
        orphan_trainee: orphanTrainee.slice(0, 15),
        orphan_batch: orphanBatch.slice(0, 15),
        duplicate_enrollment_ids_sample: duplicateEnrollmentIds.slice(0, 15),
      },
    });
  }

  return json({ error: 'Unknown resource' }, 400);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(event.httpMethod)) return json({ error: 'Method not allowed' }, 405);

  const auth = verifyAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  if (!['admin', 'staff', 'trainer', 'user'].includes(auth.role)) return json({ error: 'Forbidden' }, 403);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  const insightResource = String(event.queryStringParameters?.resource || '').trim();
  if (insightResource) {
    return handleOpsInsight(event, auth, supabase);
  }

  const entity = String(event.queryStringParameters?.entity || '').trim().toLowerCase();
  const cfg = ENTITY_CONFIG[entity];
  if (!cfg) return json({ error: 'Unknown entity' }, 400);

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

  if (event.httpMethod === 'POST' && Array.isArray(body.items)) {
    const bulkParam = String(event.queryStringParameters?.bulk || '').trim();
    if (bulkParam !== '1') return json({ error: 'Bulk import requires query bulk=1' }, 400);
    const items = body.items;
    if (!items.length) return json({ ok: true, imported: 0, failed: 0, errors: [] });

    const conflict = UPSERT_CONFLICT[entity];
    const payloads = [];
    const errors = [];
    let skippedBlank = 0;

    items.forEach((raw, index) => {
      const coerced = coerceRow(entity, raw);
      const payload = cfg.normalize(coerced);
      const missing = requireFields(payload, cfg.required);
      if (missing.length) {
        errors.push({ index, message: `Missing required fields: ${missing.join(', ')}` });
        return;
      }
      if (!String(payload[conflict] || '').trim()) {
        skippedBlank += 1;
        return;
      }
      payloads.push(payload);
    });

    let imported = 0;
    for (let i = 0; i < payloads.length; i += BULK_CHUNK) {
      const chunk = payloads.slice(i, i + BULK_CHUNK);
      const { error } = await supabase.from(cfg.table).upsert(chunk, { onConflict: conflict });
      if (error) return json({ error: error.message || 'Bulk upsert failed', imported, errors }, 500);
      imported += chunk.length;
    }

    return json({
      ok: true,
      imported,
      failed: errors.length,
      skippedBlank,
      errors: errors.length ? errors : undefined,
    });
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
