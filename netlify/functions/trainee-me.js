const { cors, json, getSupabaseServiceClient } = require('../lib/_shared');
const { verifyTraineeAuth } = require('../lib/trainee-auth');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const auth = verifyTraineeAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  const email = String(auth.email || '').trim().toLowerCase();
  const traineeId = String(auth.trainee_id || '').trim();

  const { data: account, error: ae } = await supabase
    .from('trainee_users')
    .select('trainee_id, email, must_change_password, is_active, created_at, updated_at, last_login_at')
    .eq('email', email)
    .eq('trainee_id', traineeId)
    .maybeSingle();
  if (ae) return json({ error: ae.message || 'Could not load account' }, 500);
  if (!account) return json({ error: 'Account not found' }, 404);

  const { data: trainee, error: te } = await supabase
    .from('trainees')
    .select('id, trainee_id, full_name, email, phone, trainee_type, company_name, job_title, university, specialty, city, status')
    .eq('trainee_id', traineeId)
    .maybeSingle();
  if (te) return json({ error: te.message || 'Could not load trainee profile' }, 500);

  return json({
    account,
    trainee: trainee || null,
  });
};
