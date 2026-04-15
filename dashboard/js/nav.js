import { areasForRole } from './shared.js';
import { loadUsers, loadFinanceAudit } from './domains/admin/index.js';
import { refreshFinanceAll } from './domains/finance/index.js';
import { loadPipeline, loadCapacity, loadQuality, onOperationsViewChange } from './domains/operations/index.js';
import { loadClassrooms } from './domains/classroom/index.js';
import { loadCourseLibrary } from './domains/library/index.js';
import { loadCredentialCenter } from './domains/credentials/index.js';
import { loadTraineePortal } from './domains/trainee/index.js';
import { DASHBOARD_IA, VIEW_META, WORKSPACE_LABELS, parseHashRoute, toHash } from './shell-routes.js';
import { leavePresenterToolsView, onPresenterToolsViewShown } from './training-presenter-tools.js';

const loginScreen = document.getElementById('login-screen');
const appEl = document.getElementById('app');

export function showLogin() {
  loginScreen.classList.add('visible');
  appEl.classList.add('hidden');
}

export function showApp() {
  loginScreen.classList.remove('visible');
  appEl.classList.remove('hidden');
}

export function showView(viewId) {
  const prevEl = document.querySelector('.view.active');
  const prevViewId = prevEl?.id?.startsWith('view-') ? prevEl.id.slice(5) : '';
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  if (prevViewId === 'training-presenter-tools' && viewId !== 'training-presenter-tools') {
    leavePresenterToolsView();
  }
  const el = document.getElementById(`view-${viewId}`);
  if (el) el.classList.add('active');
  if (viewId === 'training-presenter-tools') {
    onPresenterToolsViewShown();
  }
  if (viewId === 'admin') {
    loadUsers();
    loadFinanceAudit();
  }
  if (viewId === 'finance') refreshFinanceAll();
  if (viewId === 'operations-insights') loadPipeline();
  if (viewId === 'training-classroom') void loadClassrooms();
  if (viewId === 'training-course-library') void loadCourseLibrary();
  if (viewId === 'training-credentials') void loadCredentialCenter();
  if (viewId === 'trainee-portal') void loadTraineePortal();
  onOperationsViewChange(viewId);
  updateWorkspaceContext(viewId);
}

/** Switch visible view and sync area tab + subnav when applicable. */
export function navigateToView(viewId) {
  const subItem = document.querySelector(`.subnav-item[data-view="${viewId}"]`);
  if (subItem) {
    const sub = subItem.closest('.subnav');
    const area = sub && sub.getAttribute('data-for-area');
    if (area) {
      document.querySelectorAll('.subnav').forEach((s) => {
        s.classList.toggle('hidden', s.getAttribute('data-for-area') !== area);
      });
      sub.querySelectorAll('.subnav-item').forEach((b) => b.classList.remove('active'));
      sub.querySelectorAll('.subnav-item').forEach((b) => b.removeAttribute('aria-current'));
      subItem.classList.add('active');
      subItem.setAttribute('aria-current', 'page');
    }
  }
  const meta = VIEW_META[viewId];
  syncHashRoute(meta?.area, viewId);
  showView(viewId);
}

export function applyRoleVisibility() {
  const role = localStorage.getItem('sbs_role') || 'user';
  applyFinanceWriteVisibility(role);
}

function applyFinanceWriteVisibility(role) {
  const canWrite = ['admin', 'accountant'].includes(role);
  ['financePaymentForm', 'invoiceEditorCard'].forEach((id) => {
    const n = document.getElementById(id);
    if (n) n.style.display = canWrite ? '' : 'none';
  });
}

let isSyncingHash = false;

function syncHashRoute(area, viewId) {
  if (!area || !viewId) return;
  const nextHash = toHash(area, viewId);
  if (!nextHash) return;
  if (window.location.hash === nextHash) return;
  isSyncingHash = true;
  window.location.hash = nextHash;
  window.setTimeout(() => {
    isSyncingHash = false;
  }, 0);
}

function toTitleCase(value) {
  const txt = String(value || '').trim();
  if (!txt) return 'Workspace';
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function updateWorkspaceContext(viewId) {
  const role = String(localStorage.getItem('sbs_role') || 'user').toLowerCase();
  document.body.classList.remove('role-admin', 'role-staff', 'role-trainer', 'role-accountant', 'role-trainee', 'role-user');
  document.body.classList.add(`role-${role}`);

  const meta = VIEW_META[viewId] || {};
  const area = meta.area || 'operations';
  const areaLabels = WORKSPACE_LABELS[area] || WORKSPACE_LABELS.operations;

  const areaNode = document.getElementById('workspaceBreadcrumbArea');
  const viewNode = document.getElementById('workspaceBreadcrumbView');
  const titleNode = document.getElementById('workspaceTitle');
  const subNode = document.getElementById('workspaceSubtitle');
  const roleNode = document.getElementById('workspaceRoleLabel');
  const topBarWorkspaceNode = document.getElementById('topBarWorkspaceLabel');

  if (areaNode) areaNode.textContent = toTitleCase(area);
  if (viewNode) viewNode.textContent = meta.label || toTitleCase(viewId.replace(/-/g, ' '));
  if (titleNode) titleNode.textContent = areaLabels.title;
  if (subNode) subNode.textContent = areaLabels.subtitle;
  if (roleNode) roleNode.textContent = `Role: ${role}`;
  if (topBarWorkspaceNode) topBarWorkspaceNode.textContent = toTitleCase(area);
  renderContextWidgets(role, viewId);
}

function renderQuickActions(role) {
  const host = document.getElementById('workspaceQuickActions');
  if (!host) return;
  const pill = host.querySelector('.workspace-pill');
  host.innerHTML = '';
  if (pill) host.appendChild(pill);
}

function renderContextWidgets(role, viewId) {
  const host = document.getElementById('workspaceQuickActions');
  if (!host) return;
  host.querySelectorAll('.workspace-widget').forEach((n) => n.remove());
  const byRole = {
    trainer: ['Today sessions: use Classroom and Presenter tools.', 'Review grading queue before session close.'],
    staff: ['Pending work: enrollments and import follow-up.', 'Use Insights to check capacity risk.'],
    admin: ['Review user and settings updates.', 'Cross-check Finance and Campaigns status.'],
    accountant: ['Review invoice aging and payment statuses.', 'Confirm ledger entries in Finance.'],
    trainee: ['Complete assigned tasks and submissions.', 'Keep your account password updated.'],
    user: ['Monitor campaign runs and delivery status.', 'Review templates before the next run.'],
  };
  const notes = byRole[role] || byRole.user;
  const widget = document.createElement('aside');
  widget.className = 'workspace-widget';
  widget.setAttribute('aria-label', 'Context notes');
  widget.innerHTML = `<p class="workspace-widget__title">Focus now</p>
    <ul class="workspace-widget__list">
      <li>${notes[0]}</li>
      <li>${notes[1]}</li>
      <li>Current view: ${toTitleCase(String(viewId || '').replace(/-/g, ' '))}</li>
    </ul>`;
  host.appendChild(widget);
}

function runNavIaChecks() {
  const dupes = [];
  Object.entries(DASHBOARD_IA.sidebar || {}).forEach(([area, items]) => {
    const seen = new Set();
    (items || []).forEach((item) => {
      const viewId = String(item?.viewId || '').trim();
      if (!viewId) return;
      if (seen.has(viewId)) dupes.push(`${area}:${viewId}`);
      seen.add(viewId);
    });
  });
  if (dupes.length) console.warn('[IA check] Duplicate viewIds by area:', dupes.join(', '));

  const sidebarViewIds = new Set();
  Object.values(DASHBOARD_IA.sidebar || {}).forEach((items) => {
    (items || []).forEach((item) => {
      const viewId = String(item?.viewId || '').trim();
      if (viewId) sidebarViewIds.add(viewId);
    });
  });
  const missingMeta = [...sidebarViewIds].filter((viewId) => !VIEW_META[viewId]);
  if (missingMeta.length) console.warn('[IA check] Missing VIEW_META for:', missingMeta.join(', '));

  const orphanDomViews = [];
  document.querySelectorAll('section[id^="view-"]').forEach((node) => {
    const viewId = String(node.id || '').slice(5);
    const inMeta = Boolean(VIEW_META[viewId]);
    const inSidebar = sidebarViewIds.has(viewId);
    const allowedInternal = ['public-classroom', 'public-credential', 'public-learner'];
    if (!inMeta && !inSidebar && !allowedInternal.includes(viewId)) orphanDomViews.push(viewId);
  });
  if (orphanDomViews.length) console.warn('[IA check] Orphan view sections:', orphanDomViews.join(', '));
}

function applyIaLabelsAndVisibility(role) {
  const allowedViewsByArea = {};
  Object.entries(DASHBOARD_IA.sidebar).forEach(([area, items]) => {
    allowedViewsByArea[area] = new Set((items || []).map((item) => item.viewId));
  });

  document.querySelectorAll('.subnav').forEach((subnav) => {
    const area = String(subnav.getAttribute('data-for-area') || '').trim();
    const allowedViews = allowedViewsByArea[area] || new Set();
    subnav.querySelectorAll('.subnav-item').forEach((btn) => {
      const viewId = String(btn.getAttribute('data-view') || '').trim();
      const show = allowedViews.has(viewId);
      const itemCfg = (DASHBOARD_IA.sidebar[area] || []).find((x) => x.viewId === viewId);
      const labelNode = btn.querySelector('.subnav-item__label');
      if (labelNode && itemCfg?.label) labelNode.textContent = itemCfg.label;
      btn.style.display = show ? '' : 'none';
    });
  });
}

export function initShell() {
  const role = localStorage.getItem('sbs_role') || 'user';
  const allowed = areasForRole(role);
  applyIaLabelsAndVisibility(role);
  runNavIaChecks();
  renderQuickActions(role);
  if (role === 'trainee') {
    document.querySelectorAll('.subnav-item').forEach((btn) => {
      const viewId = String(btn.getAttribute('data-view') || '');
      btn.style.display = viewId === 'trainee-portal' ? '' : 'none';
    });
  }

  function showSubnavForArea(area) {
    document.querySelectorAll('.subnav').forEach((s) => {
      const forArea = s.getAttribute('data-for-area');
      s.classList.toggle('hidden', forArea !== area);
    });
  }

  function activateArea(area, viewId) {
    showSubnavForArea(area);
    const sub = document.querySelector(`.subnav[data-for-area="${area}"]`);
    if (sub) {
      sub.querySelectorAll('.subnav-item').forEach((b) => {
        const v = b.getAttribute('data-view');
        const on = v === viewId;
        b.classList.toggle('active', on);
        if (on) b.setAttribute('aria-current', 'page');
        else b.removeAttribute('aria-current');
      });
    }
    syncHashRoute(area, viewId);
    showView(viewId);
  }

  document.querySelectorAll('.subnav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const viewId = btn.getAttribute('data-view');
      const sub = btn.closest('.subnav');
      const area = sub && sub.getAttribute('data-for-area');
      if (area && !areasForRole(role).includes(area)) return;
      if (sub) sub.querySelectorAll('.subnav-item').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (sub) sub.querySelectorAll('.subnav-item').forEach((b) => b.removeAttribute('aria-current'));
      btn.setAttribute('aria-current', 'page');
      syncHashRoute(area, viewId);
      showView(viewId);
    });
  });

  const requested = parseHashRoute();
  const firstArea = allowed[0] || 'operations';
  const firstSub =
    role === 'trainee'
      ? document.querySelector('.subnav-item[data-view="trainee-portal"]')
      : document.querySelector(`.subnav[data-for-area="${firstArea}"] .subnav-item`);
  const defaultView = firstSub ? firstSub.getAttribute('data-view') : role === 'trainee' ? 'trainee-portal' : 'operations-home';
  const requestedView = String(requested?.viewId || '').trim();
  const requestedMeta = VIEW_META[requestedView];
  const canOpenRequested = requestedView && requestedMeta && allowed.includes(requestedMeta.area);
  if (canOpenRequested) {
    activateArea(requestedMeta.area, requestedView);
  } else {
    activateArea(firstArea, defaultView);
  }

  document.addEventListener('sbs:goto-view', (e) => {
    const id = e.detail && e.detail.viewId;
    if (typeof id === 'string') navigateToView(id);
  });

  window.addEventListener('hashchange', () => {
    if (isSyncingHash) return;
    const next = parseHashRoute();
    const viewId = String(next?.viewId || '').trim();
    if (!viewId) return;
    const meta = VIEW_META[viewId];
    if (!meta || !allowed.includes(meta.area)) return;
    navigateToView(viewId);
  });

  initSidebarDrawer();
}

function drawerMediaQuery() {
  return window.matchMedia('(max-width: 1040px)');
}

function closeSidebarDrawer() {
  const toggle = document.getElementById('sidebar-nav-toggle');
  const backdrop = document.getElementById('sidebarDrawerBackdrop');
  if (toggle) toggle.checked = false;
  document.body.classList.remove('sidebar-drawer-open');
  document.body.style.overflow = '';
  if (backdrop) backdrop.setAttribute('aria-hidden', 'true');
}

function initSidebarDrawer() {
  const toggle = document.getElementById('sidebar-nav-toggle');
  const backdrop = document.getElementById('sidebarDrawerBackdrop');
  if (!toggle || !backdrop) return;

  function syncBackdropA11y(open) {
    backdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  toggle.addEventListener('change', () => {
    if (!drawerMediaQuery().matches) return;
    const on = toggle.checked;
    document.body.classList.toggle('sidebar-drawer-open', on);
    document.body.style.overflow = on ? 'hidden' : '';
    syncBackdropA11y(on);
  });

  backdrop.addEventListener('click', closeSidebarDrawer);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.checked) closeSidebarDrawer();
  });

  window.addEventListener('resize', () => {
    if (!drawerMediaQuery().matches) closeSidebarDrawer();
  });

  function closeIfMobileNav() {
    if (drawerMediaQuery().matches) closeSidebarDrawer();
  }

  document.querySelectorAll('.subnav-item').forEach((btn) => {
    btn.addEventListener('click', closeIfMobileNav);
  });
}
