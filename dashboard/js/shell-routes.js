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
    title: 'Campaigns Workspace',
    subtitle: 'Operate campaigns and monitor execution.',
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
    { area: 'automation', label: 'Campaigns' },
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
      { viewId: 'training-presenter-tools', label: 'Presenter tools' },
      { viewId: 'training-classroom', label: 'Classroom' },
      { viewId: 'training-tools', label: 'Attendance & Materials' },
      { viewId: 'training-course-library', label: 'Course Library' },
      { viewId: 'training-credentials', label: 'Credentials' },
    ],
    finance: [
      { viewId: 'finance', label: 'Overview' },
    ],
    automation: [
      { viewId: 'campaigns', label: 'Campaigns' },
    ],
    admin: [
      { viewId: 'admin', label: 'Users' },
    ],
  },
};

export const VIEW_META = {
  'operations-home': { area: 'operations', label: 'Overview' },
  'operations-trainees': { area: 'operations', label: 'Trainees' },
  'trainee-profile': { area: 'operations', label: 'Trainee Profile' },
  'operations-courses': { area: 'operations', label: 'Courses' },
  'operations-batches': { area: 'operations', label: 'Batches' },
  'operations-enrollments': { area: 'operations', label: 'Enrollments' },
  'operations-bulk': { area: 'operations', label: 'Data Import' },
  'operations-insights': { area: 'operations', label: 'Insights' },
  'trainee-portal': { area: 'training', label: 'My Learning Portal' },

  training: { area: 'training', label: 'Overview' },
  'training-presenter-tools': { area: 'training', label: 'Presenter tools' },
  'training-tools': { area: 'training', label: 'Attendance and Materials' },
  'training-classroom': { area: 'training', label: 'Classroom' },
  'training-course-library': { area: 'training', label: 'Course Library' },
  'training-credentials': { area: 'training', label: 'Credentials' },

  finance: { area: 'finance', label: 'Overview' },
  campaigns: { area: 'automation', label: 'Campaigns' },
  admin: { area: 'admin', label: 'Overview' },
};

export const QUICK_ACTIONS_BY_ROLE = {
  admin: [],
  staff: [],
  trainer: [],
  accountant: [],
  trainee: [],
  user: [],
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
