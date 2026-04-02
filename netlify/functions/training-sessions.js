const { cors, json, getSupabaseServiceClient, verifyAuth } = require('./_shared');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (!['GET', 'POST'].includes(event.httpMethod)) return json({ error: 'Method not allowed' }, 405);

  const auth = verifyAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  if (!['admin', 'trainer'].includes(auth.role)) return json({ error: 'Trainer or admin role required' }, 403);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  if (event.httpMethod === 'GET') {
    const { data, error } = await supabase
      .from('training_sessions')
      .select('id, title, groups_count, created_at, training_groups(id, group_number, join_token)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return json({ error: 'Could not load training sessions' }, 500);
    return json({ sessions: data || [] });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const title = String(body.title || '').trim();
  const groupsCount = Math.max(2, Math.min(12, Number(body.groupsCount || 4)));
  if (!title) return json({ error: 'Title is required' }, 400);

  const { data: session, error: sessionErr } = await supabase
    .from('training_sessions')
    .insert({ trainer_username: auth.username || 'trainer', title, groups_count: groupsCount })
    .select('*')
    .single();
  if (sessionErr) return json({ error: sessionErr.message || 'Could not create training session' }, 500);

  const groups = [];
  for (let i = 1; i <= groupsCount; i += 1) groups.push({ session_id: session.id, group_number: i });
  const { data: createdGroups, error: groupsErr } = await supabase
    .from('training_groups')
    .insert(groups)
    .select('id, group_number, join_token');
  if (groupsErr) return json({ error: groupsErr.message || 'Could not create training groups' }, 500);

  return json({
    ok: true,
    session,
    groups: (createdGroups || []).sort((a, b) => a.group_number - b.group_number),
  });
};
