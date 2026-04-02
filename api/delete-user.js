const wrap = require('../netlify/vercelAdapter');
const mod = require('../netlify/functions/delete-user');
module.exports = wrap(mod.handler);