const { cors, json, getSupabaseServiceClient } = require('../lib/_shared');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (!['GET', 'POST'].includes(event.httpMethod)) return json({ error: 'Method not allowed' }, 405);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  const token = String(event.queryStringParameters?.token || '').trim();
  if (!token) return json({ error: 'token is required' }, 400);

  const { data: group, error: groupErr } = await supabase
    .from('training_groups')
    .select('id, group_number, session_id, training_sessions(title)')
    .eq('join_token', token)
    .maybeSingle();
  if (groupErr) return json({ error: 'Could not load group' }, 500);
  if (!group) return json({ error: 'Invalid group link' }, 404);

  if (event.httpMethod === 'GET') {
    return json({
      ok: true,
      groupId: group.id,
      groupNumber: group.group_number,
      sessionId: group.session_id,
      sessionTitle: group.training_sessions?.title || 'Training Session',
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const displayName = String(body.displayName || '').trim();
  if (!displayName || displayName.length < 2) return json({ error: 'Display name must be at least 2 characters' }, 400);

  const { data: participant, error: partErr } = await supabase
    .from('training_participants')
    .insert({ group_id: group.id, display_name: displayName })
    .select('id, display_name, joined_at')
    .single();
  if (partErr) return json({ error: partErr.message || 'Could not join group' }, 500);

  return json({
    ok: true,
    groupId: group.id,
    groupNumber: group.group_number,
    sessionId: group.session_id,
    sessionTitle: group.training_sessions?.title || 'Training Session',
    participant,
  });
};
