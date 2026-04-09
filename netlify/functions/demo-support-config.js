const { cors, json, verifyAuth, getSupabaseServiceClient, trimEnvValue } = require('../lib/_shared');

const SETTING_KEY = 'demo_whatsapp_support_number';

function normalizePhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const leadPlus = raw.startsWith('+');
  const digits = raw.replace(/\D+/g, '');
  return (leadPlus ? '+' : '') + digits;
}

function isAdmin(role) {
  return String(role || '').trim().toLowerCase() === 'admin';
}

async function readNumber(supabase) {
  const { data, error } = await supabase.from('app_settings').select('value_text').eq('key', SETTING_KEY).maybeSingle();
  const dbValue = String(data && data.value_text ? data.value_text : '').trim();
  const envValue = trimEnvValue(process.env.DEMO_WHATSAPP_SUPPORT_NUMBER || '');
  if (error) return envValue || '';
  return dbValue || envValue || '';
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors };

  if (event.httpMethod === 'GET') {
    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      const number = trimEnvValue(process.env.DEMO_WHATSAPP_SUPPORT_NUMBER || '');
      return json({ number });
    }
    const number = await readNumber(supabase);
    return json({ number });
  }

  if (event.httpMethod !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const supabase = getSupabaseServiceClient();
  if (!supabase) return json({ error: 'Service unavailable.' }, 500);

  const claims = verifyAuth(event);
  if (!claims || !isAdmin(claims.role)) return json({ error: 'Unauthorized' }, 401);

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const normalized = normalizePhone(body.number);
  if (!normalized) return json({ error: 'WhatsApp number is required.' }, 400);
  if (!/^\+?\d{8,15}$/.test(normalized)) {
    return json({ error: 'Use a valid international number, e.g. +201234567890.' }, 400);
  }

  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: SETTING_KEY, value_text: normalized, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (error) return json({ error: error.message || 'Could not save configuration.' }, 500);

  return json({ ok: true, number: normalized });
};
