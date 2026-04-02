const wrap = require('../netlify/vercelAdapter');
const mod = require('../netlify/functions/seed');
module.exports = wrap(mod.handler);