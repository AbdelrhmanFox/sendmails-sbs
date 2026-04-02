const wrap = require('../netlify/vercelAdapter');
const mod = require('../netlify/functions/operations-data');
module.exports = wrap(mod.handler);