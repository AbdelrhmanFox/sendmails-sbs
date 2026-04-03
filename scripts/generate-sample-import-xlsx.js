/**
 * Writes docs/sample-import/SBS_operations_sample.xlsx with four sheets (trainees, courses, batches, enrollments)
 * using the same header row names as docs/excel-export/*.csv.
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'sample-import', 'SBS_operations_sample.xlsx');

const trainees = [
  ['Trainee_ID', 'Full_Name', 'Phone', 'Email', 'Type', 'Company_Name', 'Job_Title', 'University', 'Specialty', 'City', 'Company_ID', 'Created_Date', 'Status', 'Notes'],
  ['TR-SAMPLE01', 'Sample Trainee', '+1000000000', 'sample.trainee@example.com', 'Doctor', 'Sample Co', 'Analyst', 'Sample University', 'General', 'Cairo', '', '2026-01-15', 'Active', 'Demo import row'],
  ['TR-SAMPLE02', 'Second Trainee', '', 'second@example.com', 'Student', '', '', '', '', 'Alexandria', '', '2026-02-01', 'Active', ''],
];

const courses = [
  ['Course_ID', 'Course_Name', 'Category', 'Target_Audience', 'Duration_Hours', 'Delivery_Type', 'Price', 'Description', 'Status'],
  ['CR-SAMPLE01', 'Sample Course Title', 'Soft Skills', 'Mixed', '40', 'Online', '1500', 'Demonstration course row', 'Active'],
];

const batches = [
  ['Batch_ID', 'Course_ID', 'Batch_Name', 'Start_Date', 'End_Date', 'Trainer', 'Location', 'Capacity'],
  ['BA-SAMPLE01', 'CR-SAMPLE01', 'Sample Batch 01', '2026-03-01', '2026-06-30', 'Sample Trainer', 'Cairo', '25'],
];

const enrollments = [
  ['Enrollment_ID', 'Trainee_ID', 'Batch_ID', 'Enrollment_Status', 'Payment_Status', 'Amount_Paid', 'Certificate_Issued', 'Enroll_Date', 'Notes'],
  ['EN-SAMPLE01', 'TR-SAMPLE01', 'BA-SAMPLE01', 'Registered', 'Pending', '', 'No', '2026-04-01', 'Links sample trainee and batch'],
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
}

main();
