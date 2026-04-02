/**
 * GET /.netlify/functions/health-supabase
 * Public diagnostic: verifies Netlify → Supabase URL resolution, key role, Auth health, and REST access.
 * Does not print secret keys. Remove or protect if you expose the site to untrusted users.
 */
const { getSupabaseApiUrl, trimEnvValue } = require('../lib/_shared');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', ...cors },
    body: JSON.stringify(body),
  };
}

function jwtRole(key) {
  if (!key || !String(key).startsWith('eyJ')) return null;
  try {
    const part = String(key).split('.')[1];
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    const payload = JSON.parse(Buffer.from(b64 + pad, 'base64').toString('utf8'));
    return payload.role || null;
  } catch (_) {
    return 'invalid_jwt';
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };
  if (event.httpMethod !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const baseUrl = getSupabaseApiUrl();
  const serviceKey = trimEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const anonKey = trimEnvValue(process.env.SUPABASE_ANON_KEY);
  const jwtApp = trimEnvValue(process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET);

  let apiHost = null;
  if (baseUrl) {
    try {
      apiHost = new URL(baseUrl).hostname;
    } catch (_) {
      apiHost = 'invalid_url';
    }
  }

  const role = jwtRole(serviceKey);
  let keySlotOk = true;
  let keySlotHint = null;
  if (serviceKey?.startsWith('sb_publishable_')) {
    keySlotOk = false;
    keySlotHint = 'SUPABASE_SERVICE_ROLE_KEY looks like a publishable key; use the secret / service_role key.';
  } else if (role === 'anon') {
    keySlotOk = false;
    keySlotHint = 'SUPABASE_SERVICE_ROLE_KEY is an anon JWT; paste the service_role JWT from Supabase → Settings → API.';
  }

  let authHealth = null;
  if (baseUrl) {
    const root = baseUrl.replace(/\/$/, '');
    try {
      const r = await fetch(`${root}/auth/v1/health`);
      authHealth = { ok: r.ok, status: r.status };
    } catch (e) {
      authHealth = { ok: false, error: String(e && e.message ? e.message : e) };
    }
  } else {
    authHealth = { ok: false, error: 'Could not resolve API URL (set SUPABASE_URL or HTTPS SUPABASE_DATABASE_URL).' };
  }

  let restProbe = null;
  if (baseUrl && serviceKey) {
    const root = baseUrl.replace(/\/$/, '');
    try {
      const r = await fetch(`${root}/rest/v1/app_users?select=id&limit=1`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });
      restProbe = {
        ok: r.ok,
        status: r.status,
        hint:
          r.status === 200 || r.status === 206
            ? 'REST reachable with this service key.'
            : r.status === 401 || r.status === 403
              ? 'REST rejected this key (wrong project or not service_role).'
              : `Unexpected status (see Supabase logs).`,
      };
    } catch (e) {
      restProbe = { ok: false, error: String(e && e.message ? e.message : e) };
    }
  } else {
    restProbe = {
      ok: false,
      error: baseUrl ? 'Missing SUPABASE_SERVICE_ROLE_KEY in Netlify env.' : 'Missing URL and/or service key.',
    };
  }

  const connected =
    Boolean(baseUrl) &&
    keySlotOk &&
    authHealth &&
    authHealth.ok &&
    restProbe &&
    restProbe.ok;

  return json({
    ok: connected,
    summary: connected
      ? 'Netlify can reach Supabase and the service key works for REST.'
      : [
          !baseUrl && 'Set SUPABASE_URL (or HTTPS database URL) for the same project as your keys.',
          !jwtApp && 'Set JWT_SECRET or SUPABASE_JWT_SECRET for dashboard login tokens.',
          !anonKey && 'Set SUPABASE_ANON_KEY for training chat / public-config (optional for login).',
          keySlotHint,
          authHealth && !authHealth.ok && authHealth.error,
          restProbe && !restProbe.ok && restProbe.error,
        ]
          .filter(Boolean)
          .join(' ') || 'See fields below.',
    apiHost,
    serviceKeyRole: role || (serviceKey?.startsWith('sb_secret_') ? 'service_sb' : serviceKey ? 'non_jwt' : null),
    keySlotOk,
    jwtAppConfigured: Boolean(jwtApp),
    anonKeyConfigured: Boolean(anonKey),
    authHealth,
    restProbe,
  });
};
