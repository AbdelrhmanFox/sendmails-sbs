const wrap = require('../netlify/vercelAdapter');
const mod = require('../netlify/functions/reset-password');
module.exports = wrap(mod.handler);