import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const SECTION_IDS = [
  'trainee-overview',
  'trainee-profile',
  'trainee-courses',
  'trainee-classroom',
  'trainee-assignments',
  'trainee-materials',
  'trainee-library',
  'trainee-password',
] as const;

const LINKS: { href: string; label: string; id: (typeof SECTION_IDS)[number] }[] = [
  { href: '#trainee-overview', label: 'Overview', id: 'trainee-overview' },
  { href: '#trainee-profile', label: 'Profile', id: 'trainee-profile' },
  { href: '#trainee-courses', label: 'Courses', id: 'trainee-courses' },
  { href: '#trainee-classroom', label: 'Classroom', id: 'trainee-classroom' },
  { href: '#trainee-assignments', label: 'Assignments', id: 'trainee-assignments' },
  { href: '#trainee-materials', label: 'Materials', id: 'trainee-materials' },
  { href: '#trainee-library', label: 'Library', id: 'trainee-library' },
  { href: '#trainee-password', label: 'Password', id: 'trainee-password' },
];

const linkBase =
  'shrink-0 rounded-[var(--brand-radius-dense)] px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-focus-ring)]';
const linkActive = 'bg-[var(--brand-primary)] text-white';
const linkInactive =
  'text-[var(--brand-muted)] hover:bg-[var(--brand-surface-2)] hover:text-[var(--brand-text)]';

/**
 * In-page section links for /trainee/portal (ISSUE-07). Hidden on other trainee routes.
 * Highlights the section most visible under the top chrome (scroll spy + hash).
 */
export function TraineeSubNav() {
  const { pathname, hash } = useLocation();
  const [activeId, setActiveId] = useState<string>(() => {
    if (hash?.startsWith('#')) return hash.slice(1);
    return 'trainee-overview';
  });

  useEffect(() => {
    if (!hash?.startsWith('#')) return;
    const id = hash.slice(1);
    if (SECTION_IDS.includes(id as (typeof SECTION_IDS)[number])) setActiveId(id);
  }, [hash]);

  useEffect(() => {
    if (pathname !== '/trainee/portal') return;

    let obs: IntersectionObserver | null = null;
    let tid: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let attempts = 0;

    const setup = () => {
      if (cancelled) return;
      if (tid) {
        clearTimeout(tid);
        tid = undefined;
      }
      const elements = SECTION_IDS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => Boolean(el));
      if (elements.length < SECTION_IDS.length && attempts < 40) {
        attempts += 1;
        tid = setTimeout(setup, 50);
        return;
      }
      if (elements.length < SECTION_IDS.length) return;

      obs?.disconnect();
      obs = new IntersectionObserver(
        (entries) => {
          const visible = entries.filter((e) => e.isIntersecting && e.target.id);
          if (!visible.length) return;
          let best = visible[0];
          for (const e of visible) {
            if ((e.intersectionRatio || 0) > (best.intersectionRatio || 0)) best = e;
          }
          const id = best.target.id;
          if (SECTION_IDS.includes(id as (typeof SECTION_IDS)[number])) setActiveId(id);
        },
        { root: null, rootMargin: '-80px 0px -42% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
      );
      for (const el of elements) obs.observe(el);
    };

    setup();
    return () => {
      cancelled = true;
      if (tid) clearTimeout(tid);
      obs?.disconnect();
    };
  }, [pathname]);

  if (pathname !== '/trainee/portal') return null;

  return (
    <nav
      className="shrink-0 border-b border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 md:px-6"
      aria-label="Trainee portal sections"
    >
      <div className="-mx-1 flex gap-1 overflow-x-auto py-2 [scrollbar-width:thin]">
        {LINKS.map(({ href, label, id }) => {
          const active = activeId === id;
          return (
            <a
              key={href}
              href={href}
              className={`${linkBase} ${active ? linkActive : linkInactive}`}
              aria-current={active ? 'true' : undefined}
            >
              {label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
