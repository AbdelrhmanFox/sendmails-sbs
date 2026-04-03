/**
 * Wraps Netlify-style `exports.handler(event)` for Vercel Node.js Serverless Functions.
 */
module.exports = function netlifyToVercel(netlifyHandler) {
  return async (req, res) => {
    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      if (req.body === undefined || req.body === null) {
        body = '{}';
      } else if (typeof req.body === 'string') {
        body = req.body;
      } else {
        body = JSON.stringify(req.body);
      }
    }

    const event = {
      httpMethod: req.method,
      headers: { ...req.headers },
      body,
      queryStringParameters: normalizeQuery(req.query),
    };

    try {
      const result = await netlifyHandler(event);
      const status = result.statusCode || 200;
      const headers = result.headers || {};
      Object.keys(headers).forEach((k) => {
        const v = headers[k];
        if (v !== undefined) res.setHeader(k, v);
      });
      const b = result.body;
      if (typeof b === 'string') {
        res.status(status).send(b);
      } else {
        res.status(status).json(b);
      }
    } catch (err) {
      console.error('[vercel adapter]', err);
      res.status(500).json({ error: 'Function error', message: String(err && err.message ? err.message : err) });
    }
  };
};

function normalizeQuery(q) {
  if (!q || typeof q !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(q)) {
    out[k] = Array.isArray(v) ? v[0] : v;
  }
  return out;
}
