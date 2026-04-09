const { cors, json, getSupabaseServiceClient, verifyAuth } = require('../lib/_shared');

function canRead(role) {
  return ['admin', 'staff'].includes(String(role || '').trim().toLowerCase());
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (!['GET', 'POST', 'PATCH'].includes(event.httpMethod)) return json({ error: 'Method not allowed' }, 405);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  if (event.httpMethod === 'POST') {
    // External baseline ingestion with shared secret.
    const secret = String(process.env.INTEGRATION_EVENTS_SECRET || '').trim();
    const hdr = String(event.headers['x-integration-secret'] || event.headers['X-Integration-Secret'] || '').trim();
    if (!secret || !hdr || secret !== hdr) return json({ error: 'Forbidden' }, 403);
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (_) {
      return json({ error: 'Invalid JSON' }, 400);
    }
    const eventType = String(body.event_type || '').trim();
    if (!eventType) return json({ error: 'event_type required' }, 400);
    const row = {
      event_type: eventType,
      source: String(body.source || 'external').trim(),
      payload: body.payload != null ? body.payload : {},
      status: 'received',
    };
    const { data, error } = await supabase.from('integration_events').insert(row).select('*').single();
    if (error) return json({ error: error.message || 'Insert failed' }, 500);
    return json({ ok: true, item: data }, 202);
  }

  const auth = verifyAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  if (!canRead(auth.role)) return json({ error: 'Forbidden' }, 403);

  if (event.httpMethod === 'GET') {
    const status = String(event.queryStringParameters?.status || '').trim();
    let q = supabase.from('integration_events').select('*').order('created_at', { ascending: false }).limit(300);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) return json({ error: error.message || 'Query failed' }, 500);
    return json({ items: data || [] });
  }

  if (event.httpMethod === 'PATCH') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (_) {
      return json({ error: 'Invalid JSON' }, 400);
    }
    const id = String(body.id || '').trim();
    if (!id) return json({ error: 'id required' }, 400);
    const status = String(body.status || '').trim();
    if (!status) return json({ error: 'status required' }, 400);
    const patch = { status };
    if (status === 'processed') patch.processed_at = new Date().toISOString();
    const { data, error } = await supabase.from('integration_events').update(patch).eq('id', id).select('*').single();
    if (error) return json({ error: error.message || 'Update failed' }, 500);
    return json({ ok: true, item: data });
  }

  return json({ error: 'Method not allowed' }, 405);
};

