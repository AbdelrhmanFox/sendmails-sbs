const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(body, status = 200) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json', ...cors },
    body: JSON.stringify(body),
  };
}

/** Netlify / dashboards sometimes store values with wrapping quotes or trailing spaces. */
function trimEnvValue(v) {
  if (v == null) return '';
  let s = String(v).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function decodeJwtPayloadUnverified(token) {
  try {
    const part = String(token).split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
    return JSON.parse(Buffer.from(b64 + pad, 'base64').toString('utf8'));
  } catch (_) {
    return null;
  }
}

/**
 * HTTPS REST URL for @supabase/supabase-js (e.g. https://abcd.supabase.co).
 * Netlify's Supabase integration may set SUPABASE_DATABASE_URL to either a postgres://
 * connection string or the REST project URL (https://<ref>.supabase.co).
 */
function getSupabaseApiUrl() {
  const direct = trimEnvValue(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL,
  );
  if (direct && /^https:\/\//i.test(direct)) {
    return direct.replace(/\/$/, '');
  }
  const ref = trimEnvValue(process.env.SUPABASE_PROJECT_REF);
  if (ref) return `https://${ref}.supabase.co`;

  const dbUrl = trimEnvValue(
    process.env.SUPABASE_DATABASE_URL ||
      process.env.DATABASE_URL ||
      process.env.SUPABASE_DB_URL ||
      process.env.NETLIFY_DATABASE_URL,
  );
  if (!dbUrl) return null;
  const s = dbUrl;

  // Netlify UI labels this "database URL" but it is often the HTTPS API base (not postgres://).
  if (/^https:\/\//i.test(s) && /\.supabase\.co(\/|$)/i.test(s)) {
    try {
      const u = new URL(s);
      if (/\.supabase\.co$/i.test(u.hostname)) {
        return `https://${u.hostname}`;
      }
    } catch (_) {
      /* ignore */
    }
  }

  const dbHost = s.match(/@db\.([a-z0-9]+)\.supabase\.co/i);
  if (dbHost) return `https://${dbHost[1]}.supabase.co`;

  const poolerUser = s.match(/\/\/postgres\.([a-z0-9]+):/i);
  if (poolerUser) return `https://${poolerUser[1]}.supabase.co`;

  const optMatch = s.match(/[?&]options=project%3D([a-z0-9]+)/i);
  if (optMatch) return `https://${optMatch[1]}.supabase.co`;

  return null;
}

function getSupabaseServiceClient() {
  const supabaseUrl = getSupabaseApiUrl();
  const supabaseKey = trimEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

function verifyAuth(event) {
  const auth = event.headers.authorization || event.headers.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  const jwtSecret = trimEnvValue(process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET);
  if (!token || !jwtSecret) return null;
  try {
    return jwt.verify(token, jwtSecret);
  } catch (_) {
    return null;
  }
}

function normalizeDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const m = slash[1].padStart(2, '0');
    const d = slash[2].padStart(2, '0');
    return `${slash[3]}-${m}-${d}`;
  }
  const dash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dash) {
    const d = dash[1].padStart(2, '0');
    const m = dash[2].padStart(2, '0');
    return `${dash[3]}-${m}-${d}`;
  }
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  return null;
}

/** Returns a hint string if the env var is not a usable service-role key. */
function assertSupabaseServiceRoleKey(supabaseKey) {
  if (supabaseKey && String(supabaseKey).startsWith('sb_publishable_')) {
    return 'SUPABASE_SERVICE_ROLE_KEY must be the secret key (sb_secret_… or legacy service_role), not the publishable key. Set it in Netlify → Environment variables, then redeploy.';
  }
  const payload = supabaseKey && String(supabaseKey).startsWith('eyJ') ? decodeJwtPayloadUnverified(supabaseKey) : null;
  if (payload && payload.role === 'anon') {
    return 'SUPABASE_SERVICE_ROLE_KEY is set to the anon (public) JWT. Paste the service_role JWT from Supabase → Settings → API, then redeploy.';
  }
  return null;
}

module.exports = {
  cors,
  json,
  trimEnvValue,
  getSupabaseApiUrl,
  getSupabaseServiceClient,
  verifyAuth,
  normalizeDate,
  assertSupabaseServiceRoleKey,
};
