const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const { getSupabaseApiUrl } = require('./_shared');

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };

function json(body, status = 200) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const key = event.queryStringParameters?.key || event.headers['x-seed-key'];
  const secret = process.env.SEED_SECRET;
  if (!secret || key !== secret) return json({ error: 'Forbidden' }, 403);

  const supabaseUrl = getSupabaseApiUrl();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return json({ error: 'Server config missing' }, 500);

  const password_hash = await bcrypt.hash('123', 10);
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: existing } = await supabase.from('app_users').select('username').eq('username', 'admin').maybeSingle();
  if (existing) return json({ ok: true, message: 'Admin already exists' });

  const { error } = await supabase.from('app_users').insert({ username: 'admin', password_hash, role: 'admin' });
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, message: 'Admin created (admin / 123)' });
};
