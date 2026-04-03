/**
 * Writes docs/sample-import/SBS_operations_sample.xlsx with four sheets (trainees, courses, batches, enrollments)
 * using the same header row names as docs/excel-export/*.csv.
 * Rows are realistic demo data with consistent IDs so enrollments reference valid trainees and batches.
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'sample-import', 'SBS_operations_sample.xlsx');
/** Same file for static hosting — "Download sample" in Operations Data. */
const OUT_DASHBOARD = path.join(ROOT, 'dashboard', 'assets', 'SBS_operations_sample.xlsx');

const trainees = [
  ['Trainee_ID', 'Full_Name', 'Phone', 'Email', 'Type', 'Company_Name', 'Job_Title', 'University', 'Specialty', 'City', 'Company_ID', 'Created_Date', 'Status', 'Notes'],
  [
    'TR-2026-001',
    'Nour El-Din Hassan',
    '+20 100 222 3344',
    'nour.hassan@example.org',
    'Physician',
    'Cairo University Hospital',
    'Resident',
    'Cairo University',
    'Internal Medicine',
    'Cairo',
    '',
    '2026-01-08',
    'Active',
    'Demo: enrolled in leadership batch',
  ],
  [
    'TR-2026-002',
    'Sara Mahmoud Fathy',
    '+20 101 333 4455',
    'sara.mahmoud@example.org',
    'Pharmacist',
    'Alexandria Health Directorate',
    'Clinical Pharmacist',
    '',
    'Hospital Pharmacy',
    'Alexandria',
    '',
    '2026-01-12',
    'Active',
    'Demo: leadership + communication',
  ],
  [
    'TR-2026-003',
    'Omar Khalil Ibrahim',
    '+20 102 444 5566',
    'omar.khalil@example.org',
    'Corporate',
    'Delta Engineering S.A.E.',
    'Project Coordinator',
    '',
    'Operations',
    'Giza',
    '',
    '2026-01-20',
    'Active',
    'Demo: communication skills cohort',
  ],
  [
    'TR-2026-004',
    'Layla Farouk',
    '+20 103 555 6677',
    'layla.farouk@example.org',
    'Student',
    '',
    '',
    'The American University in Cairo',
    'Business Administration',
    'New Cairo',
    '',
    '2026-02-03',
    'Active',
    'Demo: summer intake',
  ],
];

const courses = [
  ['Course_ID', 'Course_Name', 'Category', 'Target_Audience', 'Duration_Hours', 'Delivery_Type', 'Price', 'Description', 'Status'],
  [
    'CR-LEAD-101',
    'Leadership Essentials for Healthcare Teams',
    'Leadership',
    'Clinical & administrative staff',
    '24',
    'Hybrid',
    '4500',
    'Team communication, prioritization, and leading small-group improvement projects. Includes two onsite workshops.',
    'Active',
  ],
  [
    'CR-COMM-201',
    'Professional Communication & Presentation',
    'Soft Skills',
    'All professional tracks',
    '16',
    'Online',
    '2800',
    'Structured messaging, slide design, and delivering concise briefings to senior stakeholders.',
    'Active',
  ],
  [
    'CR-QUAL-301',
    'Quality Improvement in Clinical Settings',
    'Quality',
    'Physicians, nurses, quality officers',
    '32',
    'Hybrid',
    '6200',
    'Introduction to PDSA cycles, indicators, and audit-ready documentation for hospital units.',
    'Active',
  ],
];

const batches = [
  ['Batch_ID', 'Course_ID', 'Batch_Name', 'Start_Date', 'End_Date', 'Trainer', 'Location', 'Capacity'],
  [
    'BA-2026-Q1-LEAD',
    'CR-LEAD-101',
    'Leadership Cohort — Q1 2026 Cairo',
    '2026-03-02',
    '2026-05-15',
    'Dr. Amira Soliman',
    'SBS Training Center — Cairo',
    '22',
  ],
  [
    'BA-2026-Q1-COMM',
    'CR-COMM-201',
    'Communication Skills — March Intake',
    '2026-03-10',
    '2026-04-20',
    'Ms. Dina Kamel',
    'Online (live sessions)',
    '35',
  ],
  [
    'BA-2026-H1-QUAL',
    'CR-QUAL-301',
    'Quality Improvement — H1 2026',
    '2026-04-07',
    '2026-08-22',
    'Dr. Hany Mourad',
    'Cairo + site visits',
    '18',
  ],
];

const enrollments = [
  ['Enrollment_ID', 'Trainee_ID', 'Batch_ID', 'Enrollment_Status', 'Payment_Status', 'Amount_Paid', 'Certificate_Issued', 'Enroll_Date', 'Notes'],
  [
    'EN-2026-0001',
    'TR-2026-001',
    'BA-2026-Q1-LEAD',
    'Registered',
    'Paid',
    '4500',
    'No',
    '2026-02-10',
    'Physician track — full fee received',
  ],
  [
    'EN-2026-0002',
    'TR-2026-002',
    'BA-2026-Q1-LEAD',
    'Registered',
    'Pending',
    '2250',
    'No',
    '2026-02-11',
    '50% deposit received; balance due before first workshop',
  ],
  [
    'EN-2026-0003',
    'TR-2026-003',
    'BA-2026-Q1-COMM',
    'Attended',
    'Paid',
    '2800',
    'No',
    '2026-02-15',
    'Corporate-sponsored enrollment',
  ],
  [
    'EN-2026-0004',
    'TR-2026-004',
    'BA-2026-Q1-COMM',
    'Registered',
    'Pending',
    '',
    'No',
    '2026-02-18',
    'Awaiting student discount approval',
  ],
  [
    'EN-2026-0005',
    'TR-2026-001',
    'BA-2026-H1-QUAL',
    'Registered',
    'Pending',
    '',
    'No',
    '2026-02-20',
    'Second program for same trainee; payment plan TBD',
  ],
];

function main() {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trainees), 'trainees');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(courses), 'courses');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(batches), 'batches');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(enrollments), 'enrollments');

  const dir = path.dirname(OUT);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  XLSX.writeFile(wb, OUT);
  console.log(`Wrote ${OUT}`);

  const dashDir = path.dirname(OUT_DASHBOARD);
  if (!fs.existsSync(dashDir)) fs.mkdirSync(dashDir, { recursive: true });
  XLSX.writeFile(wb, OUT_DASHBOARD);
  console.log(`Wrote ${OUT_DASHBOARD}`);
}

main();
