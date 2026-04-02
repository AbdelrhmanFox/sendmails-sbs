const wrap = require('../netlify/vercelAdapter');
const mod = require('../netlify/functions/login');
module.exports = wrap(mod.handler);