const crypto = require('crypto');
const { cors, json, getSupabaseServiceClient } = require('../lib/_shared');

function hashClientIp(event) {
  const ip =
    event.headers['x-forwarded-for'] ||
    event.headers['X-Forwarded-For'] ||
    event.headers['client-ip'] ||
    event.headers['Client-Ip'] ||
    '';
  if (!ip) return null;
  return crypto.createHash('sha256').update(String(ip).trim()).digest('hex');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (!['GET', 'POST'].includes(event.httpMethod)) return json({ error: 'Method not allowed' }, 405);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  const resource = String(event.queryStringParameters?.resource || 'verify').trim().toLowerCase();

  if (resource === 'verify') {
    const token = String(event.queryStringParameters?.token || '').trim();
    if (!token) return json({ error: 'token required' }, 400);
    const { data, error } = await supabase
      .from('certificates')
      .select('*, credential_templates(template_name, credential_type)')
      .eq('verification_token', token)
      .maybeSingle();
    if (error) return json({ error: error.message || 'Could not verify credential' }, 500);
    if (!data) return json({ error: 'Credential not found' }, 404);

    await supabase.from('verification_logs').insert({
      certificate_id: data.id,
      verification_token: data.verification_token,
      source: 'public_verify',
      ip_hash: hashClientIp(event),
      user_agent: String(event.headers['user-agent'] || event.headers['User-Agent'] || '').slice(0, 400),
    });
    return json({
      credential: data,
      verify_status: data.revoked_at ? 'revoked' : data.status === 'expired' ? 'expired' : 'valid',
    });
  }

  if (resource === 'learner-profile') {
    const slug = String(event.queryStringParameters?.slug || '').trim().toLowerCase();
    if (!slug) return json({ error: 'slug required' }, 400);
    const { data: profile, error: profileError } = await supabase
      .from('learner_profiles')
      .select('*')
      .eq('profile_slug', slug)
      .eq('is_public', true)
      .maybeSingle();
    if (profileError) return json({ error: profileError.message || 'Could not load profile' }, 500);
    if (!profile) return json({ error: 'Profile not found' }, 404);
    const { data: credentials, error: credentialError } = await supabase
      .from('certificates')
      .select('id, certificate_no, course_id, issued_at, expires_at, status, verification_token')
      .eq('trainee_id', profile.trainee_id)
      .order('issued_at', { ascending: false })
      .limit(100);
    if (credentialError) return json({ error: credentialError.message || 'Could not load learner credentials' }, 500);
    return json({ profile, credentials: credentials || [] });
  }

  if (resource === 'spotlight') {
    const { data, error } = await supabase
      .from('spotlight_profiles')
      .select('feature_rank, is_featured, learner_profiles!inner(profile_slug, display_name, headline, bio)')
      .eq('visible', true)
      .order('feature_rank', { ascending: true })
      .limit(100);
    if (error) return json({ error: error.message || 'Could not load spotlight' }, 500);
    return json({ items: data || [] });
  }

  if (resource === 'share' && event.httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const token = String(body.token || '').trim();
    if (!token) return json({ error: 'token required' }, 400);
    const { data, error } = await supabase
      .from('certificates')
      .update({ shared_at: new Date().toISOString() })
      .eq('verification_token', token)
      .select('id, verification_token')
      .maybeSingle();
    if (error) return json({ error: error.message || 'Could not mark share event' }, 500);
    if (!data) return json({ error: 'Credential not found' }, 404);
    await supabase.from('credential_events').insert({
      certificate_id: data.id,
      event_type: 'shared',
      event_channel: String(body.channel || 'direct_link').trim(),
      event_payload: { context: 'public_page' },
    });
    return json({ ok: true });
  }

  return json({ error: 'Unknown resource' }, 400);
};
