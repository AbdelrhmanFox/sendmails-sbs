const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'GET') return json({ error: 'Method not allowed' }, 405);
  const supabaseUrl = process.env.SUPABASE_URL || (process.env.SUPABASE_PROJECT_REF && `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co`) || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
  return json({
    supabaseUrl,
    supabaseAnonKey,
    realtimeEnabled: Boolean(supabaseUrl && supabaseAnonKey),
  });
};
