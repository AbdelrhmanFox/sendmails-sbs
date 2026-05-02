import { useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { AUTH_ROLE } from '../../../lib/api';

const BASE_LINKS: { to: string; label: string }[] = [
  { to: '/training/overview', label: 'Overview' },
  { to: '/training/sessions', label: 'Sessions' },
  { to: '/training/presenter', label: 'Presenter tools' },
  { to: '/training/classroom', label: 'Classroom' },
  { to: '/training/materials', label: 'Attendance & Materials' },
  { to: '/training/library', label: 'Course Library' },
  { to: '/training/credentials', label: 'Credentials' },
];

export function TrainingLayout() {
  const role = String(localStorage.getItem(AUTH_ROLE) || '').toLowerCase();
  const links = useMemo(() => {
    if (role === 'admin' || role === 'trainer') {
      const i = BASE_LINKS.findIndex((l) => l.to === '/training/materials');
      if (i === -1) return BASE_LINKS;
      return [
        ...BASE_LINKS.slice(0, i),
        { to: '/training/assignments', label: 'Assignments' },
        ...BASE_LINKS.slice(i),
      ];
    }
    return BASE_LINKS;
  }, [role]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--brand-text)]">Training</h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">Delivery workflows, classroom tools, and resources</p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-[var(--brand-border)] pb-3">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--brand-primary)] text-white'
                  : 'text-[var(--brand-muted)] hover:bg-[var(--brand-surface-2)] hover:text-[var(--brand-text)]'
              }`
            }
          >
            {l.label}
          </NavLink>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
