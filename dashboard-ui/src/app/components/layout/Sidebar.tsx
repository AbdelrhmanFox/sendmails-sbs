import { Link, useLocation } from 'react-router-dom';
import { AUTH_USER } from '../../../lib/api';
import { areasForRole } from '../../../lib/roleAccess';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  area: string | null;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Home',
    path: '/',
    area: null,
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    id: 'operations',
    label: 'Operations',
    path: '/operations/overview',
    area: 'operations',
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    id: 'training',
    label: 'Training',
    path: '/training/overview',
    area: 'training',
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
  },
  {
    id: 'finance',
    label: 'Finance',
    path: '/finance',
    area: 'finance',
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
  },
  {
    id: 'automation',
    label: 'Email Campaigns',
    path: '/automation',
    area: 'automation',
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    id: 'admin',
    label: 'Admin',
    path: '/admin',
    area: 'admin',
    icon: (
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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

export function SidebarPanel({
  currentRole = 'user',
  onNavigate,
}: {
  currentRole?: string;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const role = String(currentRole || 'user').toLowerCase();
  const allowed = new Set(areasForRole(role));

  const filteredItems = navItems.filter((item) => !item.area || allowed.has(item.area));

  const displayName =
    typeof window !== 'undefined'
      ? String(localStorage.getItem(AUTH_USER) || '').trim() || 'User'
      : 'User';
  const initial = displayName.charAt(0).toUpperCase() || 'U';

  return (
    <div className="flex h-full w-full flex-col bg-[var(--brand-surface)]">
      {/* Logo header */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--brand-border)] px-4">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-focus-ring)] rounded"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary)] shadow-[var(--shadow-glow)]">
            <img src="/assets/logo.png" alt="SBS" className="h-4 w-auto brightness-[10]" />
          </div>
          <span className="font-brand text-sm font-bold tracking-tight text-[var(--brand-text)]">SBS Platform</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main navigation">
        <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--brand-dim)]">
          Workspace
        </p>
        <ul className="space-y-0.5">
          {filteredItems.map((item) => {
            const isActive = navIsActive(location.pathname, item);
            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  onClick={onNavigate}
                  aria-current={isActive ? 'page' : undefined}
                  className={`
                    group relative flex items-center gap-2.5 rounded-[var(--brand-radius-dense)] px-2.5 py-2
                    text-sm font-medium transition-all duration-150 focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-[var(--brand-focus-ring)]
                    ${isActive
                      ? 'bg-[var(--brand-primary-subtle)] text-[var(--brand-primary-2)]'
                      : 'text-[var(--brand-muted)] hover:bg-[var(--brand-surface-2)] hover:text-[var(--brand-text)]'
                    }
                  `}
                >
                  {/* Active left indicator */}
                  {isActive && (
                    <span className="pointer-events-none absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--brand-primary)]" />
                  )}
                  <span className={isActive ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-dim)] group-hover:text-[var(--brand-muted)]'}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="shrink-0 border-t border-[var(--brand-border)] p-2">
        <Link
          to="/account/password"
          onClick={onNavigate}
          className="mb-1 flex items-center gap-1.5 rounded-[var(--brand-radius-dense)] px-2.5 py-1.5 text-xs text-[var(--brand-muted)] transition-colors hover:bg-[var(--brand-surface-2)] hover:text-[var(--brand-text)]"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          Change password
        </Link>
        <div className="flex items-center gap-2.5 rounded-[var(--brand-radius-dense)] bg-[var(--brand-navy)] px-2.5 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand-primary)] text-xs font-bold text-white shadow-sm">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-[var(--brand-text)]">{displayName}</p>
            <p className="truncate text-[10px] capitalize text-[var(--brand-dim)]">{role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ currentRole = 'user' }: { currentRole?: string }) {
  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[var(--sidebar-w,240px)] border-r border-[var(--brand-border)] md:flex md:flex-col">
      <SidebarPanel currentRole={currentRole} />
    </aside>
  );
}
