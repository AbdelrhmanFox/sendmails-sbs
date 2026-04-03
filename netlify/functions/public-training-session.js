const { cors, json, getSupabaseServiceClient } = require('../lib/_shared');

/**
 * Public read-only session metadata for student join flows (no JWT).
 * GET ?sessionId=<uuid> → title + groups with join_token for group picker UI.
 */
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const sessionId = String(event.queryStringParameters?.sessionId || '').trim();
  if (!sessionId) return json({ error: 'sessionId is required' }, 400);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  const { data: session, error: sessionErr } = await supabase
    .from('training_sessions')
    .select('id, title, whiteboard_enabled')
    .eq('id', sessionId)
    .maybeSingle();
  if (sessionErr) return json({ error: 'Could not load session' }, 500);
  if (!session) return json({ error: 'Session not found' }, 404);

  const { data: groups, error: groupsErr } = await supabase
    .from('training_groups')
    .select('group_number, join_token')
    .eq('session_id', sessionId)
    .order('group_number', { ascending: true });
  if (groupsErr) return json({ error: 'Could not load groups' }, 500);

  return json({
    ok: true,
    title: session.title || 'Live session',
    whiteboardEnabled: session.whiteboard_enabled !== false,
    groups: groups || [],
  });
};
