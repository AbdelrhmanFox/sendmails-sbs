const bcrypt = require('bcryptjs');
const { cors, json, getSupabaseServiceClient, verifyAuth, trimEnvValue } = require('../lib/_shared');

const LOCAL_USER = trimEnvValue(process.env.LOCAL_FALLBACK_USER) || 'local';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = verifyAuth(event);
  if (!auth || !auth.username) return json({ error: 'Unauthorized' }, 401);

  const un = String(auth.username || '').trim();
  if (un === LOCAL_USER) {
    return json({ error: 'Not available for local fallback login' }, 400);
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const currentPassword = body.currentPassword != null ? String(body.currentPassword) : '';
  const newPassword = body.newPassword != null ? String(body.newPassword) : '';

  if (!currentPassword) return json({ error: 'Current password is required' }, 400);
  if (!newPassword || newPassword.length < 4) {
    return json({ error: 'New password must be at least 4 characters' }, 400);
  }
  if (newPassword === currentPassword) {
    return json({ error: 'New password must differ from current password' }, 400);
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  const { data: user, error: fe } = await supabase
    .from('app_users')
    .select('id, password_hash')
    .eq('username', un)
    .maybeSingle();

  if (fe) return json({ error: 'Could not load user' }, 500);
  if (!user || !user.password_hash) {
    return json({ error: 'User not found or password not set' }, 404);
  }

  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if (!match) return json({ error: 'Current password is incorrect' }, 401);

  const password_hash = await bcrypt.hash(newPassword, 10);
  const { error: ue } = await supabase.from('app_users').update({ password_hash }).eq('username', un);
  if (ue) return json({ error: 'Could not update password' }, 500);

  return json({ ok: true });
};
