const wrap = require('../netlify/vercelAdapter');
const mod = require('../netlify/functions/public-config');
module.exports = wrap(mod.handler);