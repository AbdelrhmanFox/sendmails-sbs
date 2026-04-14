const bcrypt = require('bcryptjs');
const { cors, json, getSupabaseServiceClient } = require('../lib/_shared');
const { signTraineeJwt, traineeJwtSecret } = require('../lib/trainee-auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return json({ error: 'Email and password are required.' }, 400);
  if (!traineeJwtSecret()) return json({ error: 'Server config missing' }, 500);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  const { data: account, error } = await supabase
    .from('trainee_users')
    .select('id, trainee_id, email, password_hash, must_change_password, is_active')
    .eq('email', email)
    .maybeSingle();
  if (error) return json({ error: error.message || 'Could not load account' }, 500);
  if (!account || !account.password_hash) return json({ error: 'Invalid email or password.' }, 401);
  if (!account.is_active) return json({ error: 'Account is inactive.' }, 403);

  const ok = await bcrypt.compare(password, account.password_hash);
  if (!ok) return json({ error: 'Invalid email or password.' }, 401);

  const token = signTraineeJwt({
    type: 'trainee',
    role: 'trainee',
    trainee_id: account.trainee_id,
    email: account.email,
  });
  if (!token) return json({ error: 'Server config missing' }, 500);

  await supabase.from('trainee_users').update({ last_login_at: new Date().toISOString() }).eq('id', account.id);

  return json({
    token,
    role: 'trainee',
    username: account.email,
    trainee_id: account.trainee_id,
    must_change_password: Boolean(account.must_change_password),
  });
};
