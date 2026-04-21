import { Link, useLocation } from 'react-router-dom';
import { areasForRole } from '../../../lib/roleAccess';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  /** When set, item is shown only if `areasForRole(role)` contains this workspace key (see dashboard/js/shared.js). */
  area: string | null;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/',
    area: null,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'operations',
    label: 'Operations',
    path: '/operations/overview',
    area: 'operations',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    id: 'training',
    label: 'Training',
    path: '/training/overview',
    area: 'training',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'finance',
    label: 'Finance',
    path: '/finance',
    area: 'finance',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'automation',
    label: 'Email Campaigns',
    path: '/automation',
    area: 'automation',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'admin',
    label: 'Admin',
    path: '/admin',
    area: 'admin',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function navIsActive(pathname: string, item: NavItem) {
  if (item.path === '/') return pathname === '/' || pathname === '';
  if (item.id === 'operations') return pathname.startsWith('/operations');
  if (item.id === 'training') return pathname.startsWith('/training');
  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

export function Sidebar({ currentRole = 'user' }: { currentRole?: string }) {
  const location = useLocation();
  const role = String(currentRole || 'user').toLowerCase();
  const allowed = new Set(areasForRole(role));

  const filteredItems = navItems.filter((item) => {
    if (!item.area) return true;
    return allowed.has(item.area);
  });

  const displayName = typeof window !== 'undefined' ? String(localStorage.getItem('sbs_username') || '').trim() || 'User' : 'User';
  const initial = displayName.charAt(0).toUpperCase() || 'U';

  return (
    <aside className="w-64 h-screen bg-[var(--brand-surface)] border-r border-[var(--brand-border)] flex flex-col fixed left-0 top-0">
      <div className="border-b border-[var(--brand-border)] p-6">
        <Link to="/" className="flex items-center gap-3">
          <img src="/assets/logo.png" alt="SBS" className="h-9 w-auto" />
          <div>
            <p className="text-lg font-bold text-[var(--brand-text)]">SBS</p>
            <p className="text-xs text-[var(--brand-muted)]">Staff dashboard</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = navIsActive(location.pathname, item);
            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200
                    ${
                      isActive
                        ? 'bg-[var(--brand-primary)] text-white shadow-[var(--brand-shadow-soft)]'
                        : 'text-[var(--brand-muted)] hover:bg-[var(--brand-surface-2)] hover:text-[var(--brand-text)]'
                    }
                  `}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-2 border-t border-[var(--brand-border)] p-4">
        <Link
          to="/account/password"
          className="block rounded-lg px-3 py-2 text-sm text-[var(--brand-muted)] hover:bg-[var(--brand-surface-2)] hover:text-[var(--brand-text)]"
        >
          Change password
        </Link>
        <div className="flex items-center gap-3 rounded-lg bg-[var(--brand-surface-2)] px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-sm font-semibold text-white">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[var(--brand-text)]">{displayName}</p>
            <p className="text-xs capitalize text-[var(--brand-muted)]">{role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
