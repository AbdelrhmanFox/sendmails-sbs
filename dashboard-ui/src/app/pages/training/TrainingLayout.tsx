import { useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { AUTH_ROLE } from '../../../lib/api';

type TrainingNavItem = { to: string; label: string };

const DELIVERY_CORE: TrainingNavItem[] = [
  { to: '/training/overview', label: 'Overview' },
  { to: '/training/sessions', label: 'Sessions' },
  { to: '/training/presenter', label: 'Presenter tools' },
  { to: '/training/classroom', label: 'Classroom' },
];

const TRAINER_DELIVERY: TrainingNavItem[] = [
  { to: '/training/assignments', label: 'Assignments' },
  { to: '/training/assessments', label: 'Assessments' },
];

const DELIVERY_TAIL: TrainingNavItem[] = [
  { to: '/training/materials', label: 'Attendance & Materials' },
];

const CATALOG_LINKS: TrainingNavItem[] = [
  { to: '/training/lms-analytics', label: 'LMS analytics' },
  { to: '/training/lms-catalog', label: 'LMS catalog' },
  { to: '/training/library', label: 'Course Library' },
  { to: '/training/credentials', label: 'Credentials' },
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-[var(--brand-primary)] text-white'
      : 'text-[var(--brand-muted)] hover:bg-[var(--brand-surface-2)] hover:text-[var(--brand-text)]'
  }`;
}

export function TrainingLayout() {
  const role = String(localStorage.getItem(AUTH_ROLE) || '').toLowerCase();
  const isTrainer = role === 'admin' || role === 'trainer';

  const deliveryLinks = useMemo(() => {
    return [...DELIVERY_CORE, ...(isTrainer ? TRAINER_DELIVERY : []), ...DELIVERY_TAIL];
  }, [isTrainer]);

  const catalogLinks = CATALOG_LINKS;

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">Training workspace</p>
      <div className="space-y-4 border-b border-[var(--brand-border)] pb-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">Delivery and classroom</p>
          <div className="flex flex-wrap gap-2">
            {deliveryLinks.map((l) => (
              <NavLink key={l.to} to={l.to} className={navLinkClass}>
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">LMS and library</p>
          <div className="flex flex-wrap gap-2">
            {catalogLinks.map((l) => (
              <NavLink key={l.to} to={l.to} className={navLinkClass}>
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
      <Outlet />
    </div>
  );
}
