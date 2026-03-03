/**
 * إنشاء حساب الأدمن (admin / 123) في Supabase – تشغيل مرة واحدة.
 * الاستخدام: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-admin.js
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or environment');
  process.exit(1);
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: existing } = await supabase.from('app_users').select('username').eq('username', 'admin').maybeSingle();
  if (existing) {
    console.log('Admin user already exists.');
    return;
  }

  const password_hash = await bcrypt.hash('123', 10);
  const { error } = await supabase.from('app_users').insert({ username: 'admin', password_hash, role: 'admin' });
  if (error) {
    if (error.code === '42P01') {
      console.error('Table app_users not found. Run supabase/schema.sql in Supabase SQL Editor first.');
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
  console.log('Admin created: username=admin, password=123');
}

main();
