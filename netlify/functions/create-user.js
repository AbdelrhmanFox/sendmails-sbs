const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
  const supabaseUrl = process.env.SUPABASE_URL || (process.env.SUPABASE_PROJECT_REF && `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co`);
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!jwtSecret || !supabaseUrl || !supabaseKey) return json({ error: 'Server config missing' }, 500);
  if (!token) return json({ error: 'Unauthorized' }, 401);

  let payload;
  try { payload = jwt.verify(token, jwtSecret); } catch (_) { return json({ error: 'Invalid or expired token' }, 401); }
  if (payload.role !== 'admin') return json({ error: 'Admin only' }, 403);

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (_) { return json({ error: 'Invalid JSON' }, 400); }
  const { username, password } = body;
  const un = String(username || '').trim();
  if (!un || un.length < 2) return json({ error: 'Username too short' }, 400);
  if (!password || typeof password !== 'string' || password.length < 4) return json({ error: 'Password must be at least 4 characters' }, 400);

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: existing } = await supabase.from('app_users').select('username').eq('username', un).maybeSingle();
  if (existing) return json({ error: 'Username already exists' }, 409);

  const password_hash = await bcrypt.hash(password, 10);
  const { error: insertErr } = await supabase.from('app_users').insert({ username: un, password_hash, role: 'user' });
  if (insertErr) return json({ error: 'Could not create user' }, 500);
  return json({ ok: true, username: un });
};
