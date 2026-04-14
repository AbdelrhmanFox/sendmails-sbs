const crypto = require('crypto');
const { cors, json, getSupabaseServiceClient, verifyAuth } = require('../lib/_shared');

function canRead(role) {
  return ['admin', 'staff', 'trainer'].includes(String(role || '').trim().toLowerCase());
}

function canWrite(role) {
  return ['admin', 'staff'].includes(String(role || '').trim().toLowerCase());
}

function bodyJson(event) {
  try {
    return JSON.parse(event.body || '{}');
  } catch (_) {
    return null;
  }
}

function asSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function parseCsvRows(input) {
  const text = String(input || '').trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',').map((v) => v.trim());
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] || '';
    });
    rows.push(row);
  }
  return rows;
}

async function insertEvent(supabase, certificateId, eventType, actor, payload = {}, channel = null) {
  await supabase.from('credential_events').insert({
    certificate_id: certificateId,
    event_type: eventType,
    event_actor: actor || null,
    event_channel: channel || null,
    event_payload: payload || {},
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (!['GET', 'POST', 'PATCH'].includes(event.httpMethod)) return json({ error: 'Method not allowed' }, 405);

  const auth = verifyAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  const role = String(auth.role || '').trim().toLowerCase();
  if (!canRead(role)) return json({ error: 'Forbidden' }, 403);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  const resource = String(event.queryStringParameters?.resource || '').trim().toLowerCase();

  if (resource === 'templates') {
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase.from('credential_templates').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) return json({ error: error.message || 'Could not load templates' }, 500);
      return json({ items: data || [] });
    }
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    const body = bodyJson(event);
    if (!body) return json({ error: 'Invalid JSON' }, 400);
    const templateCode = String(body.template_code || '').trim();
    const templateName = String(body.template_name || '').trim();
    if (!templateCode || !templateName) return json({ error: 'template_code and template_name required' }, 400);
    const row = {
      template_code: templateCode,
      template_name: templateName,
      credential_type: String(body.credential_type || 'certificate').trim(),
      template_schema: body.template_schema || {},
      brand_settings: body.brand_settings || {},
      status: String(body.status || 'active').trim(),
      created_by: String(auth.username || '').trim() || null,
    };
    const { data, error } = await supabase.from('credential_templates').insert(row).select('*').single();
    if (error) return json({ error: error.message || 'Could not create template' }, 500);
    return json({ ok: true, item: data });
  }

  if (resource === 'issue') {
    if (!canWrite(role) || event.httpMethod !== 'POST') return json({ error: 'Forbidden' }, 403);
    const body = bodyJson(event);
    if (!body) return json({ error: 'Invalid JSON' }, 400);

    const traineeId = String(body.trainee_id || '').trim();
    const courseId = String(body.course_id || '').trim();
    const certificateNo = String(body.certificate_no || '').trim();
    if (!traineeId || !courseId || !certificateNo) {
      return json({ error: 'trainee_id, course_id, and certificate_no required' }, 400);
    }
    const learnerSlug = asSlug(body.learner_slug || body.display_name || traineeId);
    const row = {
      trainee_id: traineeId,
      course_id: courseId,
      batch_id: body.batch_id ? String(body.batch_id).trim() : null,
      template_id: body.template_id ? String(body.template_id).trim() : null,
      certificate_no: certificateNo,
      status: String(body.status || 'active').trim(),
      issued_by: String(auth.username || '').trim() || null,
      learner_slug: learnerSlug || null,
      metadata: body.metadata || {},
      expires_at: body.expires_at || null,
    };
    const { data, error } = await supabase.from('certificates').insert(row).select('*').single();
    if (error) return json({ error: error.message || 'Could not issue credential' }, 500);
    await insertEvent(supabase, data.id, 'issued', auth.username, { source: 'manual_issue' }, 'dashboard');
    return json({ ok: true, item: data });
  }

  if (resource === 'bulk-issue') {
    if (!canWrite(role) || event.httpMethod !== 'POST') return json({ error: 'Forbidden' }, 403);
    const body = bodyJson(event);
    if (!body) return json({ error: 'Invalid JSON' }, 400);
    const rows = Array.isArray(body.rows) ? body.rows : parseCsvRows(body.csv || '');
    if (!rows.length) return json({ error: 'rows or csv required' }, 400);

    const actor = String(auth.username || '').trim() || null;
    const mapped = rows
      .map((r, idx) => {
        const traineeId = String(r.trainee_id || '').trim();
        const courseId = String(r.course_id || '').trim();
        const certificateNo = String(r.certificate_no || '').trim();
        if (!traineeId || !courseId || !certificateNo) return { error: `Row ${idx + 1} missing trainee_id/course_id/certificate_no` };
        return {
          trainee_id: traineeId,
          course_id: courseId,
          batch_id: r.batch_id ? String(r.batch_id).trim() : null,
          template_id: r.template_id ? String(r.template_id).trim() : null,
          certificate_no: certificateNo,
          status: String(r.status || 'active').trim(),
          issued_by: actor,
          learner_slug: asSlug(r.learner_slug || r.display_name || traineeId),
          metadata: r.metadata && typeof r.metadata === 'object' ? r.metadata : {},
        };
      });
    const invalid = mapped.filter((m) => m.error);
    if (invalid.length) return json({ error: invalid[0].error }, 400);

    const { data, error } = await supabase.from('certificates').insert(mapped).select('*');
    if (error) return json({ error: error.message || 'Bulk issue failed' }, 500);
    const inserts = (data || []).map((x) => ({
      certificate_id: x.id,
      event_type: 'issued',
      event_actor: actor,
      event_channel: 'bulk_csv',
      event_payload: { source: 'bulk_issue' },
    }));
    if (inserts.length) await supabase.from('credential_events').insert(inserts);
    return json({ ok: true, items: data || [], count: (data || []).length });
  }

  if (resource === 'credentials') {
    if (event.httpMethod === 'GET') {
      const traineeId = String(event.queryStringParameters?.trainee_id || '').trim();
      const pathwayId = String(event.queryStringParameters?.pathway_id || '').trim();
      let q = supabase
        .from('certificates')
        .select('*, credential_templates(template_name, credential_type)')
        .order('issued_at', { ascending: false })
        .limit(500);
      if (traineeId) q = q.eq('trainee_id', traineeId);
      if (pathwayId) q = q.contains('metadata', { pathway_id: pathwayId });
      const { data, error } = await q;
      if (error) return json({ error: error.message || 'Could not load credentials' }, 500);
      return json({ items: data || [] });
    }
    if (!canWrite(role) || event.httpMethod !== 'PATCH') return json({ error: 'Forbidden' }, 403);
    const body = bodyJson(event);
    if (!body) return json({ error: 'Invalid JSON' }, 400);
    const certificateId = String(body.id || '').trim();
    if (!certificateId) return json({ error: 'id required' }, 400);
    const patch = {};
    if (body.status) patch.status = String(body.status).trim();
    if (body.revoke === true) patch.revoked_at = new Date().toISOString();
    if (body.expires_at !== undefined) patch.expires_at = body.expires_at || null;
    const { data, error } = await supabase.from('certificates').update(patch).eq('id', certificateId).select('*').single();
    if (error) return json({ error: error.message || 'Could not update credential' }, 500);
    await insertEvent(supabase, certificateId, patch.revoked_at ? 'revoked' : 'updated', auth.username, patch, 'dashboard');
    return json({ ok: true, item: data });
  }

  if (resource === 'pathways') {
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase.from('pathways').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) return json({ error: error.message || 'Could not load pathways' }, 500);
      return json({ items: data || [] });
    }
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    const body = bodyJson(event);
    if (!body) return json({ error: 'Invalid JSON' }, 400);
    const code = String(body.pathway_code || '').trim();
    const name = String(body.pathway_name || '').trim();
    if (!code || !name) return json({ error: 'pathway_code and pathway_name required' }, 400);
    const row = {
      pathway_code: code,
      pathway_name: name,
      description: body.description != null ? String(body.description) : null,
      status: String(body.status || 'active').trim(),
      is_public: Boolean(body.is_public),
    };
    const { data, error } = await supabase.from('pathways').insert(row).select('*').single();
    if (error) return json({ error: error.message || 'Could not create pathway' }, 500);
    return json({ ok: true, item: data });
  }

  if (resource === 'analytics') {
    const [funnel, topShared] = await Promise.all([
      supabase.from('mv_credential_funnel').select('*').order('day', { ascending: false }).limit(30),
      supabase
        .from('certificates')
        .select('id,certificate_no,shared_at,issued_at,status')
        .not('shared_at', 'is', null)
        .order('shared_at', { ascending: false })
        .limit(20),
    ]);
    const err = funnel.error || topShared.error;
    if (err) return json({ error: err.message || 'Could not load analytics' }, 500);
    return json({ funnel: funnel.data || [], shared_recent: topShared.data || [] });
  }

  if (resource === 'learner-profiles') {
    if (event.httpMethod === 'GET') {
      const { data, error } = await supabase.from('learner_profiles').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) return json({ error: error.message || 'Could not load learner profiles' }, 500);
      return json({ items: data || [] });
    }
    if (!canWrite(role)) return json({ error: 'Forbidden' }, 403);
    const body = bodyJson(event);
    if (!body) return json({ error: 'Invalid JSON' }, 400);
    const traineeId = String(body.trainee_id || '').trim();
    if (!traineeId) return json({ error: 'trainee_id required' }, 400);
    const slug = asSlug(body.profile_slug || body.display_name || traineeId);
    const row = {
      trainee_id: traineeId,
      profile_slug: slug,
      display_name: body.display_name ? String(body.display_name) : null,
      headline: body.headline ? String(body.headline) : null,
      bio: body.bio ? String(body.bio) : null,
      social_links: body.social_links || {},
      is_public: body.is_public !== false,
    };
    const { data, error } = await supabase.from('learner_profiles').upsert(row, { onConflict: 'profile_slug' }).select('*').single();
    if (error) return json({ error: error.message || 'Could not save learner profile' }, 500);
    return json({ ok: true, item: data });
  }

  if (resource === 'webhook-issue') {
    if (!canWrite(role) || event.httpMethod !== 'POST') return json({ error: 'Forbidden' }, 403);
    const signature = String(event.headers['x-sbs-signature'] || event.headers['X-Sbs-Signature'] || '').trim();
    const secret = String(process.env.CREDENTIAL_WEBHOOK_SECRET || '').trim();
    if (secret) {
      const hmac = crypto.createHmac('sha256', secret).update(String(event.body || '')).digest('hex');
      if (!signature || hmac !== signature) return json({ error: 'Invalid webhook signature' }, 401);
    }
    const body = bodyJson(event);
    if (!body) return json({ error: 'Invalid JSON' }, 400);
    event.body = JSON.stringify(body);
    event.queryStringParameters = { resource: 'issue' };
    return exports.handler(event);
  }

  return json({ error: 'Unknown resource' }, 400);
};
