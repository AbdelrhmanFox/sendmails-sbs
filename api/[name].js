/**
 * Single Vercel Serverless Function (Hobby plan: max 12 functions; this replaces N separate api/*.js files).
 * Routes: /api/login, /api/seed, … — same as /.netlify/functions/:name via vercel.json rewrite.
 */
const netlifyToVercel = require('../netlify/lib/vercel-adapter');

const HANDLERS = {
  login: require('../netlify/functions/login').handler,
  seed: require('../netlify/functions/seed').handler,
  'training-sessions': require('../netlify/functions/training-sessions').handler,
  'training-join': require('../netlify/functions/training-join').handler,
  'training-messages': require('../netlify/functions/training-messages').handler,
  'operations-data': require('../netlify/functions/operations-data').handler,
  'finance-data': require('../netlify/functions/finance-data').handler,
  'training-data': require('../netlify/functions/training-data').handler,
  'create-user': require('../netlify/functions/create-user').handler,
  'list-users': require('../netlify/functions/list-users').handler,
  'public-config': require('../netlify/functions/public-config').handler,
  'public-training-session': require('../netlify/functions/public-training-session').handler,
  'public-classroom': require('../netlify/functions/public-classroom').handler,
  'public-classroom-upload': require('../netlify/functions/public-classroom-upload').handler,
  'public-classroom-submit': require('../netlify/functions/public-classroom-submit').handler,
  'public-classroom-review': require('../netlify/functions/public-classroom-review').handler,
  'classroom-assignment-upload': require('../netlify/functions/classroom-assignment-upload').handler,
  'classroom-material-upload': require('../netlify/functions/classroom-material-upload').handler,
  'delete-user': require('../netlify/functions/delete-user').handler,
  'reset-password': require('../netlify/functions/reset-password').handler,
  'change-password': require('../netlify/functions/change-password').handler,
  'health-supabase': require('../netlify/functions/health-supabase').handler,
  'classroom-data': require('../netlify/functions/classroom-data').handler,
  'course-library-data': require('../netlify/functions/course-library-data').handler,
  'course-library-upload': require('../netlify/functions/course-library-upload').handler,
  'assessment-data': require('../netlify/functions/assessment-data').handler,
  'lms-admin-data': require('../netlify/functions/lms-admin-data').handler,
  'lms-analytics': require('../netlify/functions/lms-analytics').handler,
  'integration-events': require('../netlify/functions/integration-events').handler,
};

function routeName(req) {
  const q = req.query && req.query.name;
  if (q && typeof q === 'string') return q;
  const m = String(req.url || '').match(/\/api\/([^/?#]+)/);
  return m ? m[1] : null;
}

module.exports = async (req, res) => {
  const name = routeName(req);
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Missing route name' });
  }
  const h = HANDLERS[name];
  if (!h) {
    return res.status(404).json({ error: 'Unknown function', name });
  }
  return netlifyToVercel(h)(req, res);
};
