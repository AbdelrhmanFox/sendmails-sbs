const { cors, json, getSupabaseServiceClient } = require('../lib/_shared');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (!['GET', 'POST'].includes(event.httpMethod)) return json({ error: 'Method not allowed' }, 405);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  if (event.httpMethod === 'GET') {
    const groupId = String(event.queryStringParameters?.groupId || '').trim();
    const since = String(event.queryStringParameters?.since || '').trim();
    if (!groupId) return json({ error: 'groupId is required' }, 400);

    let q = supabase
      .from('training_messages')
      .select('id, group_id, participant_id, sender_name, body, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (since) q = q.gte('created_at', since);

    const { data, error } = await q;
    if (error) return json({ error: 'Could not load messages' }, 500);
    return json({ ok: true, messages: data || [] });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const groupId = String(body.groupId || '').trim();
  const senderName = String(body.senderName || '').trim();
  const messageBody = String(body.body || '').trim();
  const participantId = String(body.participantId || '').trim();
  if (!groupId || !senderName || !messageBody) return json({ error: 'groupId, senderName and body are required' }, 400);
  if (messageBody.length > 1500) return json({ error: 'Message too long' }, 400);

  const { data, error } = await supabase
    .from('training_messages')
    .insert({
      group_id: groupId,
      participant_id: participantId || null,
      sender_name: senderName,
      body: messageBody,
    })
    .select('id, group_id, participant_id, sender_name, body, created_at')
    .single();
  if (error) return json({ error: error.message || 'Could not send message' }, 500);
  return json({ ok: true, message: data });
};
