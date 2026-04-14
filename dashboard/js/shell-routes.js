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

export const DASHBOARD_IA = {
  tabs: [
    { area: 'operations', label: 'Operations' },
    { area: 'training', label: 'Training' },
    { area: 'finance', label: 'Finance' },
    { area: 'automation', label: 'Automation' },
    { area: 'admin', label: 'Admin' },
  ],
  sidebar: {
    operations: [
      { viewId: 'operations-home', label: 'Overview' },
      { viewId: 'operations-trainees', label: 'Trainees' },
      { viewId: 'operations-courses', label: 'Courses' },
      { viewId: 'operations-batches', label: 'Batches' },
      { viewId: 'operations-enrollments', label: 'Enrollments' },
      { viewId: 'operations-bulk', label: 'Import' },
      { viewId: 'operations-insights', label: 'Insights' },
    ],
    training: [
      { viewId: 'training', label: 'Overview' },
      { viewId: 'training-classroom', label: 'Classroom' },
      { viewId: 'training-tools', label: 'Attendance & Materials' },
      { viewId: 'training-course-library', label: 'Course Library' },
      { viewId: 'training-credentials', label: 'Credentials' },
      { viewId: 'trainee-portal', label: 'My Learning Portal' },
    ],
    finance: [
      { viewId: 'finance', label: 'Overview' },
      { viewId: 'finance', label: 'Payments Ledger' },
      { viewId: 'finance', label: 'Invoices' },
      { viewId: 'finance', label: 'AR Aging' },
      { viewId: 'finance', label: 'Reports' },
    ],
    automation: [
      { viewId: 'campaigns', label: 'Overview' },
      { viewId: 'campaigns', label: 'Campaigns' },
      { viewId: 'campaigns', label: 'Run Status' },
    ],
    admin: [
      { viewId: 'admin', label: 'Overview' },
      { viewId: 'admin', label: 'Users' },
      { viewId: 'admin', label: 'Trainee Access Reset' },
      { viewId: 'admin', label: 'System Config' },
      { viewId: 'admin', label: 'Audit' },
    ],
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
  'trainee-portal': { area: 'training', label: 'My Learning Portal' },

  training: { area: 'training', label: 'Overview' },
  'training-tools': { area: 'training', label: 'Attendance and Materials' },
  'training-classroom': { area: 'training', label: 'Classroom' },
  'training-course-library': { area: 'training', label: 'Course Library' },
  'training-credentials': { area: 'training', label: 'Credentials' },

  finance: { area: 'finance', label: 'Overview' },
  campaigns: { area: 'automation', label: 'Overview' },
  admin: { area: 'admin', label: 'Overview' },
};

export const QUICK_ACTIONS_BY_ROLE = {
  admin: [
    { viewId: 'operations-home', label: 'Operations Overview' },
    { viewId: 'training', label: 'Training Overview' },
    { viewId: 'finance', label: 'Finance Overview' },
  ],
  staff: [
    { viewId: 'operations-home', label: 'Overview' },
    { viewId: 'operations-trainees', label: 'Trainees' },
    { viewId: 'campaigns', label: 'Campaigns' },
  ],
  trainer: [
    { viewId: 'training', label: 'Sessions' },
    { viewId: 'training-classroom', label: 'Classroom' },
    { viewId: 'training-course-library', label: 'Library' },
  ],
  accountant: [
    { viewId: 'finance', label: 'Finance Overview' },
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
