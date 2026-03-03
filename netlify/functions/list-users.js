const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };

function json(body, status = 200) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'GET') return json({ error: 'Method not allowed' }, 405);

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

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: users, error } = await supabase.from('app_users').select('username, role, created_at').order('created_at', { ascending: false });
  if (error) return json({ error: 'Database error' }, 500);
  return json({ users: users || [] });
};
