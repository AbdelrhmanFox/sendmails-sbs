/**
 * تشغيل schema.sql على Supabase ثم بذر الأدمن.
 * إن وُجد SUPABASE_ACCESS_TOKEN (Personal Access Token من supabase.com) نستخدم Management API.
 * وإلا نعطي تعليمات وتشغّل البذر فقط (إن الجدول موجود).
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const projectRef = SUPABASE_PROJECT_REF || (SUPABASE_URL && SUPABASE_URL.replace(/^https:\/\/([^.]+)\.supabase\.co.*/, '$1'));

async function runSqlViaManagementApi(sql) {
  if (!SUPABASE_ACCESS_TOKEN || !projectRef) return false;
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error('Management API error:', res.status, t);
    return false;
  }
  return true;
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or environment');
    process.exit(1);
  }

  const schemaPath = path.join(__dirname, '../supabase/schema.sql');
  if (fs.existsSync(schemaPath)) {
    const sql = fs.readFileSync(schemaPath, 'utf8').trim();
    if (SUPABASE_ACCESS_TOKEN && projectRef) {
      console.log('Running schema via Management API...');
      const ok = await runSqlViaManagementApi(sql);
      if (ok) console.log('Schema applied.');
      else console.log('Could not run schema via API. Run schema manually in Supabase SQL Editor.');
    } else {
      console.log('No SUPABASE_ACCESS_TOKEN. Run supabase/schema.sql once in Supabase → SQL Editor.');
    }
  }

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
      console.error('Table app_users not found. Run supabase/schema.sql in Supabase SQL Editor once, then run this script again.');
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
  console.log('Admin created: username=admin, password=123');
}

main();
