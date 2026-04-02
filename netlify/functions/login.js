const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSupabaseApiUrl } = require('./_shared');

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };

const LOCAL_USER = process.env.LOCAL_FALLBACK_USER || 'local';
const LOCAL_PASSWORD = process.env.LOCAL_FALLBACK_PASSWORD || 'local';

function json(body, status = 200) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify(body) };
}

function isLocalLogin(username, password) {
  return String(username).trim() === LOCAL_USER && String(password) === LOCAL_PASSWORD;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (_) { return json({ error: 'Invalid JSON' }, 400); }
  const { username, password } = body;
  if (!username || typeof password !== 'string') return json({ error: 'Username and password required' }, 400);

  const supabaseUrl = process.env.SUPABASE_URL || (process.env.SUPABASE_PROJECT_REF && `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co`);
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const jwtSecret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;

  if (isLocalLogin(username, password)) {
    if (!jwtSecret) return json({ error: 'Server config missing' }, 500);
    const token = jwt.sign({ username: LOCAL_USER, role: 'admin' }, jwtSecret, { expiresIn: '7d' });
    return json({ token, role: 'admin', username: LOCAL_USER });
  }

  if (!supabaseUrl || !supabaseKey || !jwtSecret) {
    return json({
      error: 'Server config missing',
      hint: 'Netlify: confirm Supabase extension is saved and production env includes SUPABASE_SERVICE_ROLE_KEY. If there is no SUPABASE_URL, add it as https://<ref>.supabase.co or rely on SUPABASE_DATABASE_URL (this build derives the API URL from it). Redeploy after changes.',
    }, 500);
  }

  if (String(supabaseKey).startsWith('sb_publishable_')) {
    return json({
      error: 'Server misconfiguration',
      hint: 'SUPABASE_SERVICE_ROLE_KEY must be the secret key (sb_secret_… or legacy service_role), not the publishable key.',
    }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: user, error: fetchErr } = await supabase.from('app_users').select('username, password_hash, role').eq('username', String(username).trim()).maybeSingle();
  if (fetchErr) {
    console.error('[login] Supabase query error:', fetchErr.code, fetchErr.message, fetchErr.details);
    const debug = process.env.LOGIN_DEBUG === '1';
    return json(
      {
        error: 'Database error',
        ...(debug && { details: fetchErr.message, code: fetchErr.code }),
      },
      500,
    );
  }
  if (!user || !user.password_hash) return json({ error: 'Invalid username or password' }, 401);

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return json({ error: 'Invalid username or password' }, 401);

  const token = jwt.sign({ username: user.username, role: user.role }, jwtSecret, { expiresIn: '7d' });
  return json({ token, role: user.role, username: user.username });
};
