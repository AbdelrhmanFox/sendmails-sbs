const wrap = require('../netlify/vercelAdapter');
const mod = require('../netlify/functions/training-join');
module.exports = wrap(mod.handler);