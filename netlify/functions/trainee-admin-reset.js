const bcrypt = require('bcryptjs');
const { cors, json, getSupabaseServiceClient } = require('../lib/_shared');
const { verifyAdminAuth, generateTempPassword } = require('../lib/trainee-auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = verifyAdminAuth(event);
  if (!auth) return json({ error: 'Admin only' }, 403);

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const targetEmail = String(body.email || '').trim().toLowerCase();
  const targetTraineeId = String(body.trainee_id || '').trim();
  if (!targetEmail && !targetTraineeId) return json({ error: 'email or trainee_id is required' }, 400);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  let query = supabase.from('trainees').select('trainee_id, email, full_name').limit(1);
  if (targetEmail) query = query.eq('email', targetEmail);
  else query = query.eq('trainee_id', targetTraineeId);
  const { data: trainee, error: te } = await query.maybeSingle();
  if (te) return json({ error: te.message || 'Could not load trainee' }, 500);
  if (!trainee) return json({ error: 'Trainee not found' }, 404);

  const email = String(trainee.email || '').trim().toLowerCase();
  if (!email) return json({ error: 'Trainee email is required before reset' }, 400);

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  const row = {
    trainee_id: trainee.trainee_id,
    email,
    password_hash: passwordHash,
    must_change_password: true,
    is_active: true,
    updated_at: new Date().toISOString(),
  };
  const { error: ue } = await supabase.from('trainee_users').upsert(row, { onConflict: 'trainee_id' });
  if (ue) return json({ error: ue.message || 'Could not reset trainee access' }, 500);

  return json({
    ok: true,
    trainee_id: trainee.trainee_id,
    full_name: trainee.full_name || null,
    email,
    temporary_password: tempPassword,
    must_change_password: true,
  });
};
