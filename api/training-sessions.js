const wrap = require('../netlify/vercelAdapter');
const mod = require('../netlify/functions/training-sessions');
module.exports = wrap(mod.handler);