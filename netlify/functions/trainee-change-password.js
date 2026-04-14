const bcrypt = require('bcryptjs');
const { cors, json, getSupabaseServiceClient } = require('../lib/_shared');
const { verifyTraineeAuth } = require('../lib/trainee-auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = verifyTraineeAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');
  if (!currentPassword) return json({ error: 'Current password is required.' }, 400);
  if (!newPassword || newPassword.length < 6) return json({ error: 'New password must be at least 6 characters.' }, 400);
  if (newPassword === currentPassword) return json({ error: 'New password must be different from current password.' }, 400);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  const email = String(auth.email || '').trim().toLowerCase();
  const { data: account, error } = await supabase
    .from('trainee_users')
    .select('id, password_hash')
    .eq('email', email)
    .maybeSingle();
  if (error) return json({ error: error.message || 'Could not load account' }, 500);
  if (!account) return json({ error: 'Account not found.' }, 404);

  const ok = await bcrypt.compare(currentPassword, account.password_hash);
  if (!ok) return json({ error: 'Current password is incorrect.' }, 401);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const { error: upErr } = await supabase
    .from('trainee_users')
    .update({
      password_hash: passwordHash,
      must_change_password: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', account.id);
  if (upErr) return json({ error: upErr.message || 'Could not update password' }, 500);

  return json({ ok: true });
};
