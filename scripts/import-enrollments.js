const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function normalizeDate(value) {
  const s = String(value || '').trim();
  if (!s) return null;
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return `${slash[3]}-${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}`;
  const dash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dash) return `${dash[3]}-${dash[2].padStart(2, '0')}-${dash[1].padStart(2, '0')}`;
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

async function run() {
  const supabaseUrl = process.env.SUPABASE_URL || (process.env.SUPABASE_PROJECT_REF && `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co`);
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL (or SUPABASE_PROJECT_REF) / SUPABASE_SERVICE_ROLE_KEY');
  }
  const filePath = path.resolve(process.cwd(), 'docs/excel-export/enrollments.csv');
  const csv = fs.readFileSync(filePath, 'utf8').trim();
  const lines = csv.split(/\r?\n/);
  const headers = lines[0].split(',').map((h) => h.trim());

  const records = lines.slice(1).filter(Boolean).map((line) => {
    const cells = line.split(',');
    const row = {};
    headers.forEach((h, i) => { row[h] = (cells[i] || '').trim(); });
    return {
      enrollment_id: row.Enrollment_ID,
      trainee_id: row.Trainee_ID,
      batch_id: row.Batch_ID,
      enrollment_status: row.Enrollment_Status || 'Registered',
      payment_status: row.Payment_Status || 'Pending',
      amount_paid: row.Amount_Paid ? Number(row.Amount_Paid) : null,
      certificate_issued: row.Certificate_Issued ? row.Certificate_Issued.toLowerCase() === 'yes' : null,
      enroll_date: normalizeDate(row.Enroll_Date),
      notes: row.Notes || '',
    };
  });

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { error } = await supabase.from('enrollments').upsert(records, { onConflict: 'enrollment_id' });
  if (error) throw error;

  console.log(`Imported ${records.length} enrollment row(s).`);
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
