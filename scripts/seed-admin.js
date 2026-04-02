/**
 * Create or reset admin user in Supabase (default: admin / 123456).
 * Usage: node scripts/seed-admin.js
 * Optional: SEED_ADMIN_USERNAME, SEED_ADMIN_PASSWORD, SEED_ADMIN_ROLE
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USERNAME = (process.env.SEED_ADMIN_USERNAME || 'admin').trim();
const PASSWORD = process.env.SEED_ADMIN_PASSWORD || '123456';
const ROLE = process.env.SEED_ADMIN_ROLE || 'admin';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or environment');
  process.exit(1);
}
if (SUPABASE_URL.includes('YOUR_PROJECT_REF')) {
  console.error('Set a real SUPABASE_URL in .env (https://<ref>.supabase.co).');
  process.exit(1);
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const password_hash = await bcrypt.hash(PASSWORD, 10);

  const { data: existing } = await supabase.from('app_users').select('id, username').eq('username', USERNAME).maybeSingle();
  if (existing) {
    const { error } = await supabase.from('app_users').update({ password_hash, role: ROLE }).eq('username', USERNAME);
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
    console.log(`Admin updated: username=${USERNAME}, password=${PASSWORD}`);
    return;
  }

  const { error } = await supabase.from('app_users').insert({ username: USERNAME, password_hash, role: ROLE });
  if (error) {
    if (error.code === '42P01') {
      console.error('Table app_users not found. Run supabase/schema.sql in Supabase SQL Editor first.');
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
  console.log(`Admin created: username=${USERNAME}, password=${PASSWORD}`);
}

main();
