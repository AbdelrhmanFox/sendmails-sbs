const { cors, json, getSupabaseServiceClient, verifyAuth, normalizeDate } = require('../lib/_shared');
const { coerceRow } = require('../lib/operations-import-map');

const UPSERT_CONFLICT = {
  trainees: 'trainee_id',
  courses: 'course_id',
  batches: 'batch_id',
  enrollments: 'enrollment_id',
};

const BULK_CHUNK = 75;

const SORTABLE = {
  trainees: new Set(['full_name', 'trainee_id', 'phone', 'email', 'created_at', 'city', 'status', 'trainee_type']),
  courses: new Set(['course_name', 'course_id', 'category', 'price', 'status', 'created_at']),
  batches: new Set(['batch_id', 'course_id', 'batch_name', 'start_date', 'created_at']),
  enrollments: new Set(['enrollment_id', 'trainee_id', 'batch_id', 'enrollment_status', 'payment_status', 'enroll_date', 'created_at']),
};

function parseCertificateIssued(v) {
  if (v === '' || v == null) return null;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (['yes', 'true', '1', 'y'].includes(s)) return true;
  if (['no', 'false', '0', 'n'].includes(s)) return false;
  return null;
}

/** Map "Free" / legacy labels to DB value Waived */
function normalizePaymentStatus(v) {
  const s = String(v || '')
    .trim()
    .toLowerCase();
  if (s === 'free') return 'Waived';
  return String(v || '')
    .trim();
}

const ENTITY_CONFIG = {
  trainees: {
    table: 'trainees',
    idKey: 'id',
    requiredCreate: ['full_name', 'phone', 'email'],
    requiredUpsert: ['trainee_id'],
    normalize: (b) => ({
      trainee_id: String(b.trainee_id || '').trim(),
      full_name: String(b.full_name || '').trim() || null,
      email: String(b.email || '').trim(),
      phone: String(b.phone || '').trim(),
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
    requiredCreate: ['course_name'],
    requiredUpsert: ['course_id', 'course_name'],
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
    requiredCreate: ['course_id'],
    requiredUpsert: ['batch_id'],
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
    requiredCreate: ['trainee_id', 'batch_id'],
    requiredUpsert: ['enrollment_id', 'trainee_id', 'batch_id'],
    normalize: (b) => {
      const ps = normalizePaymentStatus(b.payment_status);
      return {
        enrollment_id: String(b.enrollment_id || '').trim(),
        trainee_id: String(b.trainee_id || '').trim(),
        batch_id: String(b.batch_id || '').trim(),
        enrollment_status: String(b.enrollment_status || 'Registered').trim(),
        payment_status: ps || 'Pending',
        amount_paid: b.amount_paid === '' || b.amount_paid == null ? null : Number(b.amount_paid),
        certificate_issued: parseCertificateIssued(b.certificate_issued),
        enroll_date: normalizeDate(b.enroll_date),
        notes: String(b.notes || '').trim() || null,
        updated_at: new Date().toISOString(),
      };
    },
  },
};

function requireFields(payload, fields) {
  return fields.filter((f) => payload[f] == null || payload[f] === '');
}

async function rpcText(supabase, fn, args) {
  const { data, error } = args && Object.keys(args).length
    ? await supabase.rpc(fn, args)
    : await supabase.rpc(fn);
  if (error) throw new Error(error.message || `RPC ${fn} failed`);
  if (data == null) throw new Error(`RPC ${fn} returned no id`);
  return String(data);
}

async function assertNoDuplicateTraineeContact(supabase, phone, email, excludeId) {
  const ph = String(phone || '').trim();
  const em = String(email || '').trim();
  if (ph) {
    let q = supabase.from('trainees').select('id, trainee_id').eq('phone', ph);
    if (excludeId) q = q.neq('id', excludeId);
    const { data: byPhone } = await q.limit(1);
    if (byPhone && byPhone.length) {
      const err = new Error('DUPLICATE_PHONE');
      err.code = 409;
      err.trainee_id = byPhone[0].trainee_id;
      err.id = byPhone[0].id;
      throw err;
    }
  }
  if (em) {
    let q2 = supabase.from('trainees').select('id, trainee_id').eq('email', em);
    if (excludeId) q2 = q2.neq('id', excludeId);
    const { data: byEmail } = await q2.limit(1);
    if (byEmail && byEmail.length) {
      const err = new Error('DUPLICATE_EMAIL');
      err.code = 409;
      err.trainee_id = byEmail[0].trainee_id;
      err.id = byEmail[0].id;
      throw err;
    }
  }
}

function sanitizeIlike(s) {
  return String(s || '')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/"/g, '');
}

function validateEnrollmentPaymentRules(payload) {
  if (payload.payment_status === 'Paid') {
    if (payload.amount_paid == null || Number(payload.amount_paid) <= 0) {
      return 'Amount paid is required and must be greater than 0 when payment status is Paid';
    }
  }
  if (payload.payment_status === 'Waived') {
    payload.amount_paid = null;
  }
  return null;
}

async function handleSearch(event, auth, supabase) {
  if (event.httpMethod !== 'GET') return json({ error: 'Method not allowed' }, 405);
  if (!['admin', 'staff', 'trainer'].includes(auth.role)) return json({ error: 'Forbidden' }, 403);
  const q = String(event.queryStringParameters?.q || '').trim();
  const limit = Math.min(50, Math.max(1, parseInt(event.queryStringParameters?.limit || '8', 10) || 8));
  if (q.length < 2) return json({ results: [] });
  const safe = sanitizeIlike(q);
  const pat = `%${safe}%`;
  const { data, error } = await supabase
    .from('trainees')
    .select('id, trainee_id, full_name, phone, email, trainee_type')
    .or(`full_name.ilike."${pat}",phone.ilike."${pat}",email.ilike."${pat}",trainee_id.ilike."${pat}"`)
    .limit(limit);
  if (error) return json({ error: error.message || 'Search failed' }, 500);
  return json({ results: data || [] });
}

async function handleTraineeDetail(event, auth, supabase, id) {
  if (event.httpMethod !== 'GET') return json({ error: 'Method not allowed' }, 405);
  if (!['admin', 'staff', 'trainer'].includes(auth.role)) return json({ error: 'Forbidden' }, 403);
  const include = String(event.queryStringParameters?.include || '').trim().toLowerCase();
  const { data: item, error } = await supabase.from('trainees').select('*').eq('id', id).single();
  if (error || !item) return json({ error: 'Trainee not found' }, 404);
  if (include !== 'enrollments') return json({ item });
  const tid = item.trainee_id;
  const { data: ens, error: eErr } = await supabase.from('enrollments').select('*').eq('trainee_id', tid).order('created_at', { ascending: false });
  if (eErr) return json({ error: eErr.message }, 500);
  const batchIds = [...new Set((ens || []).map((e) => e.batch_id).filter(Boolean))];
  let batchMap = {};
  if (batchIds.length) {
    const { data: batches } = await supabase.from('batches').select('*').in('batch_id', batchIds);
    (batches || []).forEach((b) => {
      batchMap[b.batch_id] = b;
    });
  }
  const courseIds = [...new Set(Object.values(batchMap).map((b) => b.course_id).filter(Boolean))];
  let courseMap = {};
  if (courseIds.length) {
    const { data: courses } = await supabase.from('courses').select('*').in('course_id', courseIds);
    (courses || []).forEach((c) => {
      courseMap[c.course_id] = c;
    });
  }
  const enrollments = (ens || []).map((e) => {
    const b = batchMap[e.batch_id] || {};
    const c = b.course_id ? courseMap[b.course_id] : {};
    return {
      ...e,
      batch_name: b.batch_name || null,
      course_id: b.course_id || null,
      course_name: c.course_name || null,
      batch_start_date: b.start_date || null,
      batch_end_date: b.end_date || null,
      batch_trainer: b.trainer || null,
      batch_location: b.location || null,
    };
  });
  let totalPaid = 0;
  enrollments.forEach((e) => {
    if (e.amount_paid != null) totalPaid += Number(e.amount_paid);
  });
  return json({ item, enrollments, summary: { total_paid: totalPaid, enrollment_count: enrollments.length } });
}

async function handleEntityList(event, auth, supabase, entity, cfg) {
  const qs = event.queryStringParameters || {};
  const page = Math.max(1, parseInt(qs.page || '1', 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(qs.pageSize || '20', 10) || 20));
  const q = String(qs.q || '').trim();
  const sort = SORTABLE[entity].has(String(qs.sort || '').trim()) ? String(qs.sort).trim() : 'created_at';
  const dir = String(qs.dir || 'desc').toLowerCase() === 'asc' ? { ascending: true } : { ascending: false };

  let query = supabase.from(cfg.table).select('*', { count: 'exact' });

  if (q) {
    const safe = sanitizeIlike(q);
    const pat = `%${safe}%`;
    if (entity === 'trainees') {
      query = query.or(`full_name.ilike."${pat}",phone.ilike."${pat}",email.ilike."${pat}",trainee_id.ilike."${pat}"`);
    } else if (entity === 'courses') {
      query = query.or(`course_name.ilike."${pat}",course_id.ilike."${pat}"`);
    } else if (entity === 'batches') {
      query = query.or(`batch_name.ilike."${pat}",batch_id.ilike."${pat}",trainer.ilike."${pat}"`);
    } else if (entity === 'enrollments') {
      query = query.or(`enrollment_id.ilike."${pat}",trainee_id.ilike."${pat}",batch_id.ilike."${pat}"`);
    }
  }

  if (entity === 'trainees') {
    if (qs.trainee_type) query = query.eq('trainee_type', qs.trainee_type);
    if (qs.city) query = query.eq('city', qs.city);
    if (qs.status) query = query.eq('status', qs.status);
  }
  if (entity === 'courses') {
    if (qs.status) query = query.eq('status', qs.status);
    if (qs.category) query = query.eq('category', qs.category);
  }
  if (entity === 'batches') {
    if (qs.course_id) query = query.eq('course_id', qs.course_id);
  }
  if (entity === 'enrollments') {
    if (qs.enrollment_status) query = query.eq('enrollment_status', qs.enrollment_status);
    if (qs.payment_status) query = query.eq('payment_status', qs.payment_status);
    if (qs.batch_id) query = query.eq('batch_id', qs.batch_id);
    if (qs.trainee_id) query = query.eq('trainee_id', qs.trainee_id);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.order(sort, dir).range(from, to);
  const { data, error, count } = await query;
  if (error) return json({ error: error.message || 'Query failed' }, 500);

  let items = data || [];

  if (entity === 'batches') {
    const { data: ens } = await supabase.from('enrollments').select('batch_id');
    const perBatch = {};
    (ens || []).forEach((e) => {
      if (e.batch_id) perBatch[e.batch_id] = (perBatch[e.batch_id] || 0) + 1;
    });
    items = items.map((b) => {
      const enrolled = perBatch[b.batch_id] || 0;
      const cap = b.capacity != null ? Number(b.capacity) : null;
      return {
        ...b,
        enrolled_count: enrolled,
        utilization_pct: cap && cap > 0 ? Math.round((100 * enrolled) / cap) : null,
      };
    });
  }

  if (entity === 'enrollments' && items.length) {
    const tids = [...new Set(items.map((it) => it.trainee_id).filter(Boolean))];
    const bids = [...new Set(items.map((it) => it.batch_id).filter(Boolean))];
    let tmap = {};
    let bmap = {};
    if (tids.length) {
      const { data: trs } = await supabase.from('trainees').select('trainee_id, full_name').in('trainee_id', tids);
      (trs || []).forEach((t) => {
        tmap[t.trainee_id] = t.full_name;
      });
    }
    if (bids.length) {
      const { data: bts } = await supabase.from('batches').select('batch_id, batch_name, course_id').in('batch_id', bids);
      (bts || []).forEach((b) => {
        bmap[b.batch_id] = { batch_name: b.batch_name, course_id: b.course_id };
      });
    }
    const cids = [...new Set(Object.values(bmap).map((x) => x.course_id).filter(Boolean))];
    let cmap = {};
    if (cids.length) {
      const { data: crs } = await supabase.from('courses').select('course_id, course_name').in('course_id', cids);
      (crs || []).forEach((c) => {
        cmap[c.course_id] = c.course_name;
      });
    }
    items = items.map((it) => {
      const b = bmap[it.batch_id] || {};
      const cn = b.course_id ? cmap[b.course_id] : null;
      return {
        ...it,
        trainee_name: tmap[it.trainee_id] || '',
        batch_name: b.batch_name || '',
        course_id: b.course_id || '',
        course_name: cn || '',
      };
    });
  }

  return json({ items, total: count ?? items.length, page, pageSize });
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
    const { data: batches, error: bErr } = await supabase.from('batches').select('batch_id, capacity, course_id, batch_name');
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
        batch_name: b.batch_name,
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
    const { data: ens } = await supabase.from('enrollments').select('enrollment_id, trainee_id, batch_id, payment_status, amount_paid');

    const orphanTrainee = [];
    const orphanBatch = [];
    const idCounts = {};
    const paidZero = [];
    (ens || []).forEach((e) => {
      if (!traineeSet.has(e.trainee_id)) orphanTrainee.push(e.enrollment_id);
      if (!batchSet.has(e.batch_id)) orphanBatch.push(e.enrollment_id);
      const ek = e.enrollment_id;
      idCounts[ek] = (idCounts[ek] || 0) + 1;
      if (e.payment_status === 'Paid' && (e.amount_paid == null || Number(e.amount_paid) <= 0)) paidZero.push(e.enrollment_id);
    });
    const duplicateEnrollmentIds = Object.keys(idCounts).filter((k) => idCounts[k] > 1);

    return json({
      orphan_trainee_refs: orphanTrainee.length,
      orphan_batch_refs: orphanBatch.length,
      duplicate_enrollment_ids: duplicateEnrollmentIds.length,
      paid_with_zero_amount: paidZero.length,
      samples: {
        orphan_trainee: orphanTrainee.slice(0, 15),
        orphan_batch: orphanBatch.slice(0, 15),
        duplicate_enrollment_ids_sample: duplicateEnrollmentIds.slice(0, 15),
        paid_zero_amount_sample: paidZero.slice(0, 15),
      },
    });
  }

  return json({ error: 'Unknown resource' }, 400);
}

async function handleBulkEnrollments(event, auth, supabase) {
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!['admin', 'staff'].includes(auth.role)) return json({ error: 'Forbidden' }, 403);
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const rawIds = Array.isArray(body.enrollment_ids) ? body.enrollment_ids : [];
  const ids = rawIds.map((x) => String(x || '').trim()).filter(Boolean);
  const enrollment_status = String(body.enrollment_status || '').trim();
  const payment_status = normalizePaymentStatus(body.payment_status || '');
  const amount_paid = body.amount_paid;
  const enrollmentAllowed = new Set(['Registered', 'Attended', 'Cancelled', 'Completed']);
  const paymentAllowed = new Set(['Pending', 'Paid', 'Waived']);

  if (!ids.length || ids.length > 200) return json({ error: 'Provide 1–200 enrollment_ids' }, 400);

  const update = { updated_at: new Date().toISOString() };
  if (enrollment_status && enrollmentAllowed.has(enrollment_status)) update.enrollment_status = enrollment_status;
  if (payment_status && paymentAllowed.has(payment_status)) update.payment_status = payment_status;
  if (amount_paid !== undefined && amount_paid !== null && amount_paid !== '') {
    update.amount_paid = Number(amount_paid);
  }
  if (payment_status === 'Waived') update.amount_paid = null;

  if (update.payment_status === 'Paid') {
    if (update.amount_paid == null || Number(update.amount_paid) <= 0) {
      return json({ error: 'Amount paid required when setting payment to Paid' }, 400);
    }
  }

  if (!update.enrollment_status && !update.payment_status && update.amount_paid === undefined) {
    return json({ error: 'Provide enrollment_status and/or payment_status' }, 400);
  }

  const { data, error } = await supabase.from('enrollments').update(update).in('enrollment_id', ids).select('enrollment_id');
  if (error) return json({ error: error.message || 'Bulk update failed' }, 500);
  return json({ ok: true, requested: ids.length, updated: (data || []).length });
}

async function ensureBulkIds(supabase, entity, cfg, payload) {
  if (entity === 'trainees' && !payload.trainee_id) {
    payload.trainee_id = await rpcText(supabase, 'next_trainee_id');
  }
  if (entity === 'courses' && !payload.course_id) {
    payload.course_id = await rpcText(supabase, 'next_course_id');
  }
  if (entity === 'batches' && !payload.batch_id) {
    if (!payload.course_id) throw new Error('course_id required for new batch');
    payload.batch_id = await rpcText(supabase, 'next_batch_id', { p_course_id: payload.course_id });
  }
  if (entity === 'enrollments' && !payload.enrollment_id) {
    payload.enrollment_id = await rpcText(supabase, 'next_enrollment_id');
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (!['GET', 'POST', 'PUT', 'DELETE'].includes(event.httpMethod)) return json({ error: 'Method not allowed' }, 405);

  const auth = verifyAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  if (!['admin', 'staff', 'trainer', 'user'].includes(auth.role)) return json({ error: 'Forbidden' }, 403);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  const qResource = String(event.queryStringParameters?.resource || '').trim().toLowerCase();
  if (qResource === 'bulk-enrollments') {
    return handleBulkEnrollments(event, auth, supabase);
  }
  if (qResource === 'search') {
    return handleSearch(event, auth, supabase);
  }
  if (qResource === 'pipeline' || qResource === 'capacity' || qResource === 'data-quality') {
    return handleOpsInsight(event, auth, supabase);
  }
  if (qResource) {
    return json({ error: 'Unknown resource' }, 400);
  }

  const entity = String(event.queryStringParameters?.entity || '').trim().toLowerCase();
  const cfg = ENTITY_CONFIG[entity];
  if (!cfg) return json({ error: 'Unknown entity' }, 400);

  if (event.httpMethod === 'GET') {
    const detailId = String(event.queryStringParameters?.id || '').trim();
    if (entity === 'trainees' && detailId) {
      return handleTraineeDetail(event, auth, supabase, detailId);
    }
    if (!['admin', 'staff', 'trainer', 'user'].includes(auth.role)) return json({ error: 'Forbidden' }, 403);
    return handleEntityList(event, auth, supabase, entity, cfg);
  }

  if (!['admin', 'staff', 'trainer'].includes(auth.role)) return json({ error: 'Forbidden' }, 403);

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
    const errors = [];
    let skippedBlank = 0;
    let imported = 0;

    for (let i = 0; i < items.length; i += BULK_CHUNK) {
      const chunkRaw = items.slice(i, i + BULK_CHUNK);
      const payloads = [];
      for (let j = 0; j < chunkRaw.length; j++) {
        const raw = chunkRaw[j];
        const index = i + j;
        try {
          const coerced = coerceRow(entity, raw);
          if (entity === 'enrollments' && coerced.payment_status != null) {
            coerced.payment_status = normalizePaymentStatus(coerced.payment_status);
          }
          const payload = cfg.normalize(coerced);
          try {
            await ensureBulkIds(supabase, entity, cfg, payload);
          } catch (e) {
            errors.push({ index, message: e.message || 'ID generation failed' });
            continue;
          }
          const missing = requireFields(payload, cfg.requiredUpsert);
          if (missing.length) {
            errors.push({ index, message: `Missing required fields: ${missing.join(', ')}` });
            continue;
          }
          if (entity === 'trainees') {
            const missC = requireFields(payload, cfg.requiredCreate);
            if (missC.length) {
              errors.push({ index, message: `Missing required fields: ${missC.join(', ')}` });
              continue;
            }
          }
          if (entity === 'courses') {
            if (!payload.course_name) {
              errors.push({ index, message: 'course_name required' });
              continue;
            }
          }
          if (entity === 'batches') {
            if (!payload.course_id) {
              errors.push({ index, message: 'course_id required' });
              continue;
            }
          }
          if (entity === 'enrollments') {
            const payErr = validateEnrollmentPaymentRules(payload);
            if (payErr) {
              errors.push({ index, message: payErr });
              continue;
            }
          }
          if (!String(payload[conflict] || '').trim()) {
            skippedBlank += 1;
            continue;
          }
          payloads.push(payload);
        } catch (e) {
          errors.push({ index, message: e.message || 'Row error' });
        }
      }
      if (!payloads.length) continue;
      const { error } = await supabase.from(cfg.table).upsert(payloads, { onConflict: conflict });
      if (error) return json({ error: error.message || 'Bulk upsert failed', imported, errors }, 500);
      imported += payloads.length;
    }

    return json({
      ok: true,
      imported,
      failed: errors.length,
      skippedBlank,
      errors: errors.length ? errors.slice(0, 50) : undefined,
    });
  }

  if (event.httpMethod === 'POST') {
    try {
      if (entity === 'enrollments' && body.payment_status != null) {
        body = { ...body, payment_status: normalizePaymentStatus(body.payment_status) };
      }
      const payload = cfg.normalize(body);
      const miss = requireFields(payload, cfg.requiredCreate);
      if (miss.length) return json({ error: `Missing required fields: ${miss.join(', ')}` }, 400);

      if (entity === 'trainees') {
        if (!payload.email || !payload.phone) return json({ error: 'Email and phone are required' }, 400);
        await assertNoDuplicateTraineeContact(supabase, payload.phone, payload.email, null);
        if (!payload.trainee_id) payload.trainee_id = await rpcText(supabase, 'next_trainee_id');
      } else if (entity === 'courses') {
        if (!payload.course_id) payload.course_id = await rpcText(supabase, 'next_course_id');
      } else if (entity === 'batches') {
        if (!payload.course_id) return json({ error: 'course_id is required' }, 400);
        if (!payload.batch_id) payload.batch_id = await rpcText(supabase, 'next_batch_id', { p_course_id: payload.course_id });
      } else if (entity === 'enrollments') {
        const payErr = validateEnrollmentPaymentRules(payload);
        if (payErr) return json({ error: payErr }, 400);
        if (!payload.enrollment_id) payload.enrollment_id = await rpcText(supabase, 'next_enrollment_id');
      }

      const missing = requireFields(payload, cfg.requiredUpsert);
      if (missing.length) return json({ error: `Missing required fields: ${missing.join(', ')}` }, 400);

      const { data, error } = await supabase.from(cfg.table).insert(payload).select('*').single();
      if (error) return json({ error: error.message || 'Insert failed' }, 500);
      return json({ ok: true, item: data });
    } catch (e) {
      if (e.code === 409) return json({ error: e.message, trainee_id: e.trainee_id, id: e.id, hint: 'duplicate' }, 409);
      return json({ error: e.message || 'Create failed' }, 500);
    }
  }

  if (event.httpMethod === 'PUT') {
    const id = String(body[cfg.idKey] || '').trim();
    if (!id) return json({ error: `${cfg.idKey} is required` }, 400);
    try {
      if (entity === 'enrollments' && body.payment_status != null) {
        body = { ...body, payment_status: normalizePaymentStatus(body.payment_status) };
      }
      const payload = cfg.normalize(body);
      const missing = requireFields(payload, cfg.requiredUpsert);
      if (missing.length) return json({ error: `Missing required fields: ${missing.join(', ')}` }, 400);

      if (entity === 'trainees') {
        if (!payload.email || !payload.phone) return json({ error: 'Email and phone are required' }, 400);
        await assertNoDuplicateTraineeContact(supabase, payload.phone, payload.email, id);
      }
      if (entity === 'enrollments') {
        const payErr = validateEnrollmentPaymentRules(payload);
        if (payErr) return json({ error: payErr }, 400);
      }

      const { data, error } = await supabase.from(cfg.table).update(payload).eq(cfg.idKey, id).select('*').single();
      if (error) return json({ error: error.message || 'Update failed' }, 500);
      return json({ ok: true, item: data });
    } catch (e) {
      if (e.code === 409) return json({ error: e.message, trainee_id: e.trainee_id, id: e.id, hint: 'duplicate' }, 409);
      return json({ error: e.message || 'Update failed' }, 500);
    }
  }

  const id = String(event.queryStringParameters?.id || '').trim();
  if (!id) return json({ error: 'id query parameter is required' }, 400);
  const { error } = await supabase.from(cfg.table).delete().eq(cfg.idKey, id);
  if (error) return json({ error: error.message || 'Delete failed' }, 500);
  return json({ ok: true });
};
