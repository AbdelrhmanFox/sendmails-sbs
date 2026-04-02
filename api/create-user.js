const wrap = require('../netlify/vercelAdapter');
const mod = require('../netlify/functions/create-user');
module.exports = wrap(mod.handler);