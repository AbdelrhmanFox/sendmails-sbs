const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const { getSupabaseApiUrl } = require('../lib/_shared');

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };

function json(body, status = 200) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = event.headers.authorization || event.headers.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
  const supabaseUrl = getSupabaseApiUrl();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!jwtSecret || !supabaseUrl || !supabaseKey) return json({ error: 'Server config missing' }, 500);
  if (!token) return json({ error: 'Unauthorized' }, 401);

  let payload;
  try { payload = jwt.verify(token, jwtSecret); } catch (_) { return json({ error: 'Invalid or expired token' }, 401); }
  if (payload.role !== 'admin') return json({ error: 'Admin only' }, 403);

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (_) { return json({ error: 'Invalid JSON' }, 400); }
  const un = String(body.username || '').trim();
  if (!un) return json({ error: 'Username required' }, 400);
  if (un === payload.username) return json({ error: 'Cannot delete your own account' }, 400);
  if (un === 'admin') return json({ error: 'Cannot delete admin user' }, 400);

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { error } = await supabase.from('app_users').delete().eq('username', un);
  if (error) return json({ error: 'Could not delete user' }, 500);
  return json({ ok: true, username: un });
};
