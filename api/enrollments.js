const wrap = require('../netlify/vercelAdapter');
const mod = require('../netlify/functions/enrollments');
module.exports = wrap(mod.handler);