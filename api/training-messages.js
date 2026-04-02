const wrap = require('../netlify/vercelAdapter');
const mod = require('../netlify/functions/training-messages');
module.exports = wrap(mod.handler);