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

  const supabaseUrl = process.env.SUPABASE_URL || (process.env.SUPABASE_PROJECT_REF && `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co`);
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;
  if (!supabaseUrl || !supabaseKey || !jwtSecret) return json({ error: 'Server config missing' }, 500);

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (_) { return json({ error: 'Invalid JSON' }, 400); }
  const { username, password } = body;
  if (!username || typeof password !== 'string') return json({ error: 'Username and password required' }, 400);

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: user, error: fetchErr } = await supabase.from('app_users').select('username, password_hash, role').eq('username', String(username).trim()).maybeSingle();
  if (fetchErr) return json({ error: 'Database error' }, 500);
  if (!user || !user.password_hash) return json({ error: 'Invalid username or password' }, 401);

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return json({ error: 'Invalid username or password' }, 401);

  const token = jwt.sign({ username: user.username, role: user.role }, jwtSecret, { expiresIn: '7d' });
  return json({ token, role: user.role, username: user.username });
};
