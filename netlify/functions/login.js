const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSupabaseApiUrl, assertSupabaseServiceRoleKey, trimEnvValue } = require('../lib/_shared');

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

  const supabaseUrl = getSupabaseApiUrl();
  const supabaseKey = trimEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const jwtSecret = trimEnvValue(process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET);

  if (isLocalLogin(username, password)) {
    if (!jwtSecret) {
      return json({
        error: 'Server config missing',
        hint: 'Set JWT_SECRET or SUPABASE_JWT_SECRET on Netlify and redeploy.',
      }, 500);
    }
    const token = jwt.sign({ username: LOCAL_USER, role: 'admin' }, jwtSecret, { expiresIn: '7d' });
    return json({ token, role: 'admin', username: LOCAL_USER });
  }

  if (!supabaseUrl || !supabaseKey || !jwtSecret) {
    return json({
      error: 'Server config missing',
      hint: 'Netlify: confirm Supabase extension is saved and production env includes SUPABASE_SERVICE_ROLE_KEY. If there is no SUPABASE_URL, add it as https://<ref>.supabase.co or rely on SUPABASE_DATABASE_URL (this build derives the API URL from it). Redeploy after changes.',
    }, 500);
  }

  const keyHint = assertSupabaseServiceRoleKey(supabaseKey);
  if (keyHint) return json({ error: 'Server misconfiguration', hint: keyHint }, 500);

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const un = String(username).trim();
    const { data: rows, error: fetchErr } = await supabase
      .from('app_users')
      .select('username, password_hash, role')
      .eq('username', un)
      .limit(5);

    if (fetchErr) {
      console.error('[login] Supabase query error:', fetchErr.code, fetchErr.message, fetchErr.details);
      const hint = [fetchErr.code, fetchErr.message].filter(Boolean).join(' — ');
      return json(
        {
          error: 'Database error',
          hint: hint || 'Supabase request failed; check Netlify env keys and project ref.',
        },
        500,
      );
    }

    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 0) return json({ error: 'Invalid username or password' }, 401);
    if (list.length > 1) {
      console.error('[login] Multiple rows for username', un);
      return json({ error: 'Database error', hint: 'Duplicate usernames in app_users' }, 500);
    }

    const user = list[0];
    if (!user || !user.password_hash) return json({ error: 'Invalid username or password' }, 401);

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return json({ error: 'Invalid username or password' }, 401);

    const token = jwt.sign({ username: user.username, role: user.role }, jwtSecret, { expiresIn: '7d' });
    return json({ token, role: user.role, username: user.username });
  } catch (err) {
    console.error('[login] Unhandled error:', err);
    return json(
      {
        error: 'Database error',
        hint: process.env.LOGIN_DEBUG === '1' ? String(err && err.message) : 'Unhandled error; see Netlify function logs or set LOGIN_DEBUG=1.',
      },
      500,
    );
  }
};
