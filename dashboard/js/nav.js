import { areasForRole } from './shared.js';
import { loadUsers, loadFinanceAudit } from './admin.js';
import { refreshFinanceAll } from './finance.js';
import { loadPipeline, loadCapacity, loadQuality, onOperationsViewChange } from './operations.js';
import { loadClassrooms } from './classroom.js';
import { loadCourseLibrary } from './course-library.js';
import { loadCredentialCenter } from './credentials.js';
import { loadTraineePortal } from './trainee-portal.js';

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
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
  const el = document.getElementById(`view-${viewId}`);
  if (el) el.classList.add('active');
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
}

/** Switch visible view and sync area tab + subnav when applicable. */
export function navigateToView(viewId) {
  const subItem = document.querySelector(`.subnav-item[data-view="${viewId}"]`);
  if (subItem) {
    const sub = subItem.closest('.subnav');
    const area = sub && sub.getAttribute('data-for-area');
    if (area) {
      document.querySelectorAll('.area-tab').forEach((t) => {
        t.classList.toggle('active', t.getAttribute('data-area') === area);
      });
      document.querySelectorAll('.subnav').forEach((s) => {
        s.classList.toggle('hidden', s.getAttribute('data-for-area') !== area);
      });
      sub.querySelectorAll('.subnav-item').forEach((b) => b.classList.remove('active'));
      subItem.classList.add('active');
    }
  }
  showView(viewId);
}

export function applyRoleVisibility() {
  const role = localStorage.getItem('sbs_role') || 'user';
  const allowed = areasForRole(role);
  document.querySelectorAll('.area-tab').forEach((tab) => {
    const area = tab.getAttribute('data-area');
    const show = allowed.includes(area);
    tab.style.display = show ? '' : 'none';
  });
  applyFinanceWriteVisibility(role);
}

function applyFinanceWriteVisibility(role) {
  const canWrite = ['admin', 'accountant'].includes(role);
  ['financePaymentForm', 'invoiceEditorCard'].forEach((id) => {
    const n = document.getElementById(id);
    if (n) n.style.display = canWrite ? '' : 'none';
  });
}

export function initShell() {
  const role = localStorage.getItem('sbs_role') || 'user';
  const allowed = areasForRole(role);
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
    document.querySelectorAll('.area-tab').forEach((t) => {
      t.classList.toggle('active', t.getAttribute('data-area') === area);
    });
    showSubnavForArea(area);
    const sub = document.querySelector(`.subnav[data-for-area="${area}"]`);
    if (sub) {
      sub.querySelectorAll('.subnav-item').forEach((b) => {
        const v = b.getAttribute('data-view');
        b.classList.toggle('active', v === viewId);
      });
    }
    showView(viewId);
  }

  document.querySelectorAll('.area-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const area = tab.getAttribute('data-area');
      if (!areasForRole(role).includes(area)) return;
      const sub = document.querySelector(`.subnav[data-for-area="${area}"]`);
      const first = sub && sub.querySelector('.subnav-item');
      const viewId = first ? first.getAttribute('data-view') : area;
      activateArea(area, viewId);
    });
  });

  document.querySelectorAll('.subnav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const viewId = btn.getAttribute('data-view');
      const sub = btn.closest('.subnav');
      const area = sub && sub.getAttribute('data-for-area');
      if (area && !areasForRole(role).includes(area)) return;
      if (sub) sub.querySelectorAll('.subnav-item').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      if (area) {
        document.querySelectorAll('.area-tab').forEach((t) => {
          t.classList.toggle('active', t.getAttribute('data-area') === area);
        });
      }
      showView(viewId);
    });
  });

  const firstArea = allowed[0] || 'operations';
  const firstSub =
    role === 'trainee'
      ? document.querySelector('.subnav-item[data-view="trainee-portal"]')
      : document.querySelector(`.subnav[data-for-area="${firstArea}"] .subnav-item`);
  const firstView = firstSub ? firstSub.getAttribute('data-view') : role === 'trainee' ? 'trainee-portal' : 'operations-home';
  activateArea(firstArea, firstView);

  document.addEventListener('sbs:goto-view', (e) => {
    const id = e.detail && e.detail.viewId;
    if (typeof id === 'string') navigateToView(id);
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
  document.querySelectorAll('.area-tab').forEach((btn) => {
    btn.addEventListener('click', closeIfMobileNav);
  });
}
