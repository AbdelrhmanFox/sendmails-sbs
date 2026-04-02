const wrap = require('../netlify/vercelAdapter');
const mod = require('../netlify/functions/health-supabase');
module.exports = wrap(mod.handler);