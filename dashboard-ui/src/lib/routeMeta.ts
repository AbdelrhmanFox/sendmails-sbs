/**
 * Maps React Router pathname (inside basename `/spa`) to TopBar copy.
 * Keep in sync with routes in `app/App.tsx`.
 */
export type RouteMeta = { title: string; subtitle?: string };

function normalizePath(pathname: string): string {
  let p = pathname || '/';
  if (!p.startsWith('/')) p = `/${p}`;
  const trimmed = p.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed;
}

export function getRouteMeta(pathname: string): RouteMeta {
  const p = normalizePath(pathname);

  if (p === '/' || p === '') {
    return { title: 'Home', subtitle: 'Role-based landing' };
  }
  if (p === '/dashboard') {
    return { title: 'Dashboard', subtitle: 'Overview and shortcuts' };
  }
  if (p === '/trainee/portal') {
    return { title: 'Trainee portal', subtitle: 'Courses, classroom, and assignments' };
  }
  if (p === '/account/password') {
    return { title: 'Change password', subtitle: 'Update your account password' };
  }
  if (p === '/finance') {
    return { title: 'Finance', subtitle: 'KPIs and payment flows' };
  }
  if (p === '/automation') {
    return { title: 'Email campaigns', subtitle: 'Automation and outreach' };
  }
  if (p === '/admin') {
    return { title: 'Admin', subtitle: 'System administration' };
  }

  if (p.startsWith('/operations/trainees/')) {
    return { title: 'Trainee profile', subtitle: 'Operations workspace' };
  }
  if (p === '/operations/overview') {
    return { title: 'Operations', subtitle: 'Overview' };
  }
  if (p === '/operations/insights') {
    return { title: 'Operations', subtitle: 'Insights' };
  }
  if (p === '/operations/import') {
    return { title: 'Operations', subtitle: 'Import' };
  }
  if (p === '/operations/integration-events') {
    return { title: 'Operations', subtitle: 'Integration events' };
  }
  if (p === '/operations/lms-admin') {
    return { title: 'Operations', subtitle: 'LMS admin' };
  }
  if (p.startsWith('/operations')) {
    return { title: 'Operations', subtitle: 'Workspace' };
  }

  if (p === '/training/overview') {
    return { title: 'Training', subtitle: 'Overview' };
  }
  if (p === '/training/sessions') {
    return { title: 'Training', subtitle: 'Sessions' };
  }
  if (p === '/training/presenter') {
    return { title: 'Training', subtitle: 'Presenter tools' };
  }
  if (p === '/training/classroom') {
    return { title: 'Training', subtitle: 'Classroom' };
  }
  if (p === '/training/assignments') {
    return { title: 'Training', subtitle: 'Assignments' };
  }
  if (p === '/training/assessments') {
    return { title: 'Training', subtitle: 'Assessments' };
  }
  if (p === '/training/materials') {
    return { title: 'Training', subtitle: 'Attendance & materials' };
  }
  if (p === '/training/library') {
    return { title: 'Training', subtitle: 'Course library' };
  }
  if (p === '/training/credentials') {
    return { title: 'Training', subtitle: 'Credentials' };
  }
  if (p === '/training/lms-analytics') {
    return { title: 'Training', subtitle: 'LMS analytics' };
  }
  if (p === '/training/lms-catalog') {
    return { title: 'Training', subtitle: 'LMS catalog' };
  }
  if (p.startsWith('/training')) {
    return { title: 'Training', subtitle: 'Delivery workspace' };
  }

  return { title: 'SBS', subtitle: undefined };
}
