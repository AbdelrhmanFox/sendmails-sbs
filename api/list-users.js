const wrap = require('../netlify/vercelAdapter');
const mod = require('../netlify/functions/list-users');
module.exports = wrap(mod.handler);