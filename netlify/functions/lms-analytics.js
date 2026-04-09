const { cors, json, getSupabaseServiceClient, verifyAuth } = require('../lib/_shared');

function canRead(role) {
  return ['admin', 'staff', 'trainer'].includes(String(role || '').trim().toLowerCase());
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const auth = verifyAuth(event);
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  if (!canRead(auth.role)) return json({ error: 'Forbidden' }, 403);

  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Server config missing' }, 500);

  const resource = String(event.queryStringParameters?.resource || 'overview').trim().toLowerCase();

  if (resource === 'overview') {
    const [progress, assessments, attempts, certs] = await Promise.all([
      supabase.from('learner_course_progress').select('*', { count: 'exact', head: true }),
      supabase.from('assessments').select('*', { count: 'exact', head: true }),
      supabase.from('assessment_attempts').select('*', { count: 'exact', head: true }),
      supabase.from('certificates').select('*', { count: 'exact', head: true }),
    ]);
    const err = progress.error || assessments.error || attempts.error || certs.error;
    if (err) return json({ error: err.message || 'Analytics query failed' }, 500);
    return json({
      progress_records: progress.count ?? 0,
      assessments: assessments.count ?? 0,
      attempts: attempts.count ?? 0,
      certificates: certs.count ?? 0,
    });
  }

  if (resource === 'completion-by-course') {
    const { data, error } = await supabase.from('mv_course_completion_summary').select('*').order('completion_rate_pct', { ascending: false }).limit(500);
    if (error) return json({ error: error.message || 'Could not load completion summary' }, 500);
    return json({ items: data || [] });
  }

  return json({ error: 'Unknown resource' }, 400);
};

