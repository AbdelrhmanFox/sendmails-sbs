export type RouteMeta = { title: string; subtitle?: string };

function normalizePath(pathname: string): string {
  let p = pathname || '/';
  if (!p.startsWith('/')) p = `/${p}`;
  const trimmed = p.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

export function getRouteMeta(pathname: string): RouteMeta {
  const p = normalizePath(pathname);

  if (p === '/' || p === '') return { title: 'SBS Learn' };
  if (p === '/dashboard') return { title: 'Dashboard', subtitle: 'Platform overview' };
  if (p === '/trainee/portal') return { title: 'My Learning', subtitle: 'Courses, classroom, and assignments' };
  if (p === '/account/password') return { title: 'Change Password', subtitle: 'Update your account password' };
  if (p === '/finance' || p === '/finance/overview') return { title: 'Finance Overview', subtitle: 'KPIs and revenue analytics' };
  if (p === '/finance/receivables') return { title: 'Receivables', subtitle: 'Student balances and installments' };
  if (p === '/finance/cashbook') return { title: 'Cash Book', subtitle: 'Income and expense register' };
  if (p === '/finance/expenses') return { title: 'Expenses', subtitle: 'Add and manage expenses' };
  if (p === '/finance/staff') return { title: 'Staff', subtitle: 'Internal team directory and payroll reference' };
  if (p === '/finance/subscriptions') return { title: 'Subscriptions', subtitle: 'Monthly, quarterly, and yearly recurring items' };
  if (p === '/finance/payments') return { title: 'Payments', subtitle: 'Record student payments' };
  if (p === '/finance/receipts') return { title: 'Receipts', subtitle: 'Issue and print cash receipts' };
  if (p === '/finance/invoices') return { title: 'Invoices', subtitle: 'Invoice management' };
  if (p === '/finance/ledger') return { title: 'Ledger', subtitle: 'Full payment transaction log' };
  if (p.startsWith('/finance')) return { title: 'Finance', subtitle: 'Accounting workspace' };
  if (p === '/automation') return { title: 'Campaigns', subtitle: 'Email automation and outreach' };
  if (p === '/admin') return { title: 'Admin', subtitle: 'System administration' };
  if (p === '/tools') return { title: 'Tools', subtitle: 'QR code generator and utilities' };

  if (p.startsWith('/operations/trainees/')) return { title: 'Student Profile', subtitle: 'Management' };
  if (p === '/operations/overview') return { title: 'Students', subtitle: 'Overview' };
  if (p === '/operations/trainees') return { title: 'Students', subtitle: 'Management' };
  if (p === '/operations/batches') return { title: 'Learning Paths', subtitle: 'Batch management' };
  if (p === '/operations/courses') return { title: 'Courses', subtitle: 'Course management' };
  if (p === '/operations/insights') return { title: 'Analytics', subtitle: 'Business insights' };
  if (p === '/operations/import') return { title: 'Import Data', subtitle: 'Bulk data import' };
  if (p === '/operations/integration-events') return { title: 'Integration Events', subtitle: 'System logs' };
  if (p === '/operations/lms-admin') return { title: 'Courses', subtitle: 'Course catalog & LMS admin' };
  if (p.startsWith('/operations')) return { title: 'Management', subtitle: 'Operations workspace' };

  if (p === '/training/overview') return { title: 'Training', subtitle: 'Overview' };
  if (p === '/training/sessions') return { title: 'Live Sessions', subtitle: 'Training delivery' };
  if (p === '/training/presenter') return { title: 'Presenter Tools', subtitle: 'Live session controls' };
  if (p === '/training/classroom') return { title: 'Classroom', subtitle: 'Virtual room links' };
  if (p === '/training/assignments') return { title: 'Assignments', subtitle: 'Submissions and reviews' };
  if (p === '/training/assessments') return { title: 'Assessments', subtitle: 'Quizzes and exams' };
  if (p === '/training/materials') return { title: 'Attendance', subtitle: 'Materials and attendance' };
  if (p === '/training/library') return { title: 'Course Library', subtitle: 'Content repository' };
  if (p === '/training/credentials') return { title: 'Certificates', subtitle: 'Credentials and badges' };
  if (p === '/training/lms-analytics') return { title: 'LMS Analytics', subtitle: 'Learner progress and insights' };
  if (p === '/training/lms-catalog') return { title: 'LMS Catalog', subtitle: 'Available courses' };
  if (p.startsWith('/training')) return { title: 'Training', subtitle: 'Delivery workspace' };

  return { title: 'SBS Learn' };
}
