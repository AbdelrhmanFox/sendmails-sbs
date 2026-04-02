const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const ROOT = process.cwd();
const EXPORT_DIR = path.join(ROOT, 'docs', 'excel-export');

function normalizeDate(value) {
  const s = String(value || '').trim();
  if (!s) return null;
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const y = slash[3].length === 2 ? `20${slash[3]}` : slash[3];
    return `${y}-${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}`;
  }
  const dash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dash) {
    const y = dash[3].length === 2 ? `20${dash[3]}` : dash[3];
    return `${y}-${dash[2].padStart(2, '0')}-${dash[1].padStart(2, '0')}`;
  }
  const dt = new Date(s);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString().slice(0, 10);
}

function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) return [];
  const [headerLine, ...rows] = raw.split(/\r?\n/);
  const headers = headerLine.split(',').map((h) => h.trim());
  return rows
    .filter(Boolean)
    .map((line) => {
      const cells = line.split(',');
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (cells[i] || '').trim(); });
      return obj;
    });
}

async function run() {
  const supabaseUrl = process.env.SUPABASE_URL || (process.env.SUPABASE_PROJECT_REF && `https://${process.env.SUPABASE_PROJECT_REF}.supabase.co`);
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) throw new Error('Missing Supabase env values');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const trainees = parseCsv(path.join(EXPORT_DIR, 'trainees.csv')).map((r) => ({
    trainee_id: r.Trainee_ID,
    full_name: r.Full_Name || null,
    phone: r.Phone || null,
    email: r.Email || null,
    trainee_type: r.Type || null,
    company_name: r.Company_Name || null,
    job_title: r.Job_Title || null,
    university: r.University || null,
    specialty: r.Specialty || null,
    city: r.City || null,
    created_date: normalizeDate(r.Created_Date),
    status: 'Active',
  })).filter((r) => r.trainee_id);

  const courses = parseCsv(path.join(EXPORT_DIR, 'courses.csv')).map((r) => ({
    course_id: r.Course_ID,
    course_name: r.Course_Name || '',
    category: r.Category || null,
    target_audience: r.Target_Audience || null,
    duration_hours: r.Duration_Hours ? Number(r.Duration_Hours) : null,
    delivery_type: r.Delivery_Type || null,
    price: r.Price ? Number(r.Price) : null,
    description: r.Description || null,
    status: r.Status || 'Active',
  })).filter((r) => r.course_id);

  const batches = parseCsv(path.join(EXPORT_DIR, 'batches.csv')).map((r) => ({
    batch_id: r.Batch_ID,
    course_id: r.Course_ID || null,
    batch_name: r.Batch_Name || null,
    start_date: normalizeDate(r.Start_Date),
    end_date: normalizeDate(r.End_Date),
    trainer: r.Trainer || null,
    location: r.Location || null,
    capacity: r.Capacity ? Number(r.Capacity) : null,
  })).filter((r) => r.batch_id);

  const enrollments = parseCsv(path.join(EXPORT_DIR, 'enrollments.csv')).map((r) => ({
    enrollment_id: r.Enrollment_ID,
    trainee_id: r.Trainee_ID || '',
    batch_id: r.Batch_ID || '',
    enrollment_status: r.Enrollment_Status || 'Registered',
    payment_status: r.Payment_Status || 'Pending',
    amount_paid: r.Amount_Paid ? Number(r.Amount_Paid) : null,
    certificate_issued: r.Certificate_Issued ? r.Certificate_Issued.toLowerCase() === 'yes' : null,
    enroll_date: normalizeDate(r.Enroll_Date),
    notes: r.Notes || null,
  })).filter((r) => r.enrollment_id && r.trainee_id && r.batch_id);

  if (trainees.length) {
    const { error } = await supabase.from('trainees').upsert(trainees, { onConflict: 'trainee_id' });
    if (error) throw error;
  }
  if (courses.length) {
    const { error } = await supabase.from('courses').upsert(courses, { onConflict: 'course_id' });
    if (error) throw error;
  }
  if (batches.length) {
    const { error } = await supabase.from('batches').upsert(batches, { onConflict: 'batch_id' });
    if (error) throw error;
  }
  if (enrollments.length) {
    const { error } = await supabase.from('enrollments').upsert(enrollments, { onConflict: 'enrollment_id' });
    if (error) throw error;
  }

  console.log(`Imported trainees: ${trainees.length}`);
  console.log(`Imported courses: ${courses.length}`);
  console.log(`Imported batches: ${batches.length}`);
  console.log(`Imported enrollments: ${enrollments.length}`);
}

run().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
