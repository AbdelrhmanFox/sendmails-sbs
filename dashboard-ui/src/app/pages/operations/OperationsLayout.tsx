import { NavLink, Outlet } from 'react-router-dom';

const LINKS: { to: string; label: string }[] = [
  { to: '/operations/overview', label: 'Overview' },
  { to: '/operations/trainees', label: 'Trainees' },
  { to: '/operations/courses', label: 'Courses' },
  { to: '/operations/batches', label: 'Batches' },
  { to: '/operations/enrollments', label: 'Enrollments' },
  { to: '/operations/import', label: 'Import' },
  { to: '/operations/insights', label: 'Insights' },
];

export function OperationsLayout() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--brand-text)]">Operations</h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">Workbook-aligned data and execution views</p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-[var(--brand-border)] pb-3">
        {LINKS.map((l) => (
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
