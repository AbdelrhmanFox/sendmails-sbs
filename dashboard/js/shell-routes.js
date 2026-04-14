export const WORKSPACE_LABELS = {
  operations: {
    title: 'Operations Workspace',
    subtitle: 'Manage data, track execution, and move work forward.',
  },
  training: {
    title: 'Training Workspace',
    subtitle: 'Run delivery workflows, classroom management, and resources.',
  },
  finance: {
    title: 'Finance Workspace',
    subtitle: 'Monitor cash flow, invoices, and operational finance health.',
  },
  automation: {
    title: 'Automation Workspace',
    subtitle: 'Operate campaigns and monitor automation execution.',
  },
  admin: {
    title: 'Admin Workspace',
    subtitle: 'Manage users, controls, and platform support settings.',
  },
};

export const VIEW_META = {
  'operations-home': { area: 'operations', label: 'Overview' },
  'operations-trainees': { area: 'operations', label: 'Trainees' },
  'operations-courses': { area: 'operations', label: 'Courses' },
  'operations-batches': { area: 'operations', label: 'Batches' },
  'operations-enrollments': { area: 'operations', label: 'Enrollments' },
  'operations-bulk': { area: 'operations', label: 'Data Import' },
  'operations-insights': { area: 'operations', label: 'Insights' },
  trainee-portal: { area: 'training', label: 'My Learning Portal' },

  training: { area: 'training', label: 'Session Management' },
  'training-tools': { area: 'training', label: 'Attendance and Materials' },
  'training-classroom': { area: 'training', label: 'Classroom' },
  'training-course-library': { area: 'training', label: 'Course Library' },
  'training-credentials': { area: 'training', label: 'Credentials' },

  finance: { area: 'finance', label: 'Finance Dashboard' },
  campaigns: { area: 'automation', label: 'Email Campaigns' },
  admin: { area: 'admin', label: 'Manage Users' },
};

export const QUICK_ACTIONS_BY_ROLE = {
  admin: [
    { viewId: 'operations-home', label: 'Operations Home' },
    { viewId: 'training', label: 'Training Hub' },
    { viewId: 'finance', label: 'Finance Board' },
  ],
  staff: [
    { viewId: 'operations-home', label: 'Operations Home' },
    { viewId: 'operations-trainees', label: 'Trainees' },
    { viewId: 'campaigns', label: 'Campaigns' },
  ],
  trainer: [
    { viewId: 'training', label: 'Sessions' },
    { viewId: 'training-classroom', label: 'Classroom' },
    { viewId: 'training-course-library', label: 'Library' },
  ],
  accountant: [
    { viewId: 'finance', label: 'Finance Dashboard' },
    { viewId: 'finance', label: 'Ledger' },
    { viewId: 'finance', label: 'Invoices' },
  ],
  trainee: [
    { viewId: 'trainee-portal', label: 'My Portal' },
    { viewId: 'trainee-portal', label: 'My Classroom' },
    { viewId: 'trainee-portal', label: 'My Account' },
  ],
  user: [
    { viewId: 'campaigns', label: 'Campaigns' },
    { viewId: 'campaigns', label: 'Preview' },
    { viewId: 'campaigns', label: 'Status' },
  ],
};

export function parseHashRoute() {
  const raw = String(window.location.hash || '').replace(/^#/, '').trim();
  if (!raw) return null;
  const parts = raw.split('/').filter(Boolean);
  if (!parts.length) return null;
  if (parts.length === 1) return { viewId: parts[0] };
  return { area: parts[0], viewId: parts.slice(1).join('/') };
}

export function toHash(area, viewId) {
  if (!area || !viewId) return '';
  return `#/${area}/${viewId}`;
}
