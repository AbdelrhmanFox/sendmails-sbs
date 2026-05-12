import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/design-system/Button';
import { ThemeToggle } from '../components/layout/ThemeToggle';
import { Input } from '../components/design-system/Input';
import { AUTH_ROLE, AUTH_TOKEN, AUTH_USER, functionsBase, jsonFetch } from '../../lib/api';

type LoginResponse = { token: string; role: string; username?: string };

const FEATURES = [
  {
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    title: 'Operations Management',
    desc: 'Trainees, courses, batches, and enrollments — all in one place.',
  },
  {
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
    title: 'Live Training Delivery',
    desc: 'Sessions, classrooms, assignments, and assessments for trainers.',
  },
  {
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    title: 'Finance & Revenue Tracking',
    desc: 'KPIs, invoices, ledger, and payment records.',
  },
  {
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    title: 'Email Campaign Automation',
    desc: 'n8n-powered campaigns with preview, send, and status controls.',
  },
];

export function LoginPage() {
  const [accountType, setAccountType] = useState<'staff' | 'trainee'>('staff');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (accountType === 'trainee') {
        const data = await jsonFetch<LoginResponse>(`${functionsBase()}/trainee-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: username.trim(), password }),
        });
        localStorage.setItem(AUTH_TOKEN, data.token);
        localStorage.setItem(AUTH_ROLE, data.role || 'trainee');
        localStorage.setItem(AUTH_USER, data.username || username.trim());
      } else {
        const data = await jsonFetch<LoginResponse>(`${functionsBase()}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), password }),
        });
        localStorage.setItem(AUTH_TOKEN, data.token);
        localStorage.setItem(AUTH_ROLE, data.role || 'user');
        localStorage.setItem(AUTH_USER, data.username || username.trim());
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--brand-bg)]">
      {/* ── Left hero panel (hidden on small screens) ── */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-[var(--brand-border)] bg-[var(--brand-surface)] p-10 lg:flex lg:w-[52%]">
        {/* Decorative background */}
        <div className="pointer-events-none absolute inset-0">
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: 'linear-gradient(var(--brand-border) 1px, transparent 1px), linear-gradient(90deg, var(--brand-border) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
          {/* Glows */}
          <div className="absolute -left-20 -top-20 h-96 w-96 rounded-full bg-[var(--brand-primary)] opacity-[0.06] blur-[80px]" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[var(--brand-accent)] opacity-[0.04] blur-[60px]" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-primary)] shadow-[var(--shadow-glow)]">
              <img src="/assets/logo.png" alt="SBS logo" className="h-5 w-auto brightness-[10]" />
            </div>
            <span className="font-brand text-base font-bold text-[var(--brand-text)]">SBS Platform</span>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 my-auto">
          <h2 className="font-brand mb-4 max-w-md text-4xl font-bold leading-tight text-[var(--brand-text)]">
            The modern platform for{' '}
            <span className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-2)] bg-clip-text text-transparent">
              educational operations
            </span>
          </h2>
          <p className="mb-10 max-w-sm text-base text-[var(--brand-muted)]">
            Manage training delivery, track finance, automate campaigns, and empower trainees — all from one place.
          </p>

          <ul className="space-y-4">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--brand-primary-subtle)] text-[var(--brand-primary)]">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--brand-text)]">{f.title}</p>
                  <p className="text-xs text-[var(--brand-muted)]">{f.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-xs text-[var(--brand-dim)]">
            SBS Educational Services — staff portal
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10">
        {/* Theme toggle */}
        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle className="border border-[var(--brand-border)] bg-[var(--brand-surface)]" />
        </div>

        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--brand-primary)] shadow-[var(--shadow-glow)]">
              <img src="/assets/logo.png" alt="SBS logo" className="h-4 w-auto brightness-[10]" />
            </div>
            <span className="font-brand text-base font-bold text-[var(--brand-text)]">SBS Platform</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="font-brand mb-1.5 text-2xl font-bold text-[var(--brand-text)]">
              {accountType === 'trainee' ? 'Access your learning' : 'Welcome back'}
            </h1>
            <p className="text-sm text-[var(--brand-muted)]">
              {accountType === 'trainee'
                ? 'Sign in to view your courses, assignments, and materials.'
                : 'Sign in to the SBS staff dashboard.'}
            </p>
          </div>

          {/* Account type toggle */}
          <div className="mb-6 flex rounded-[var(--brand-radius-dense)] bg-[var(--brand-navy)] p-1">
            {(['staff', 'trainee'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => { setAccountType(type); setError(''); setUsername(''); setPassword(''); }}
                className={`flex-1 rounded-[calc(var(--brand-radius-dense)-2px)] py-1.5 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-focus-ring)] ${
                  accountType === type
                    ? 'bg-[var(--brand-surface)] text-[var(--brand-text)] shadow-sm'
                    : 'text-[var(--brand-muted)] hover:text-[var(--brand-text)]'
                }`}
              >
                {type === 'staff' ? 'Staff' : 'Trainee'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label={accountType === 'trainee' ? 'Email address' : 'Username'}
              type={accountType === 'trainee' ? 'email' : 'text'}
              placeholder={accountType === 'trainee' ? 'you@example.com' : 'Enter your username'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete={accountType === 'trainee' ? 'email' : 'username'}
              required
              icon={
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              }
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                icon={
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="mt-1.5 text-xs text-[var(--brand-muted)] hover:text-[var(--brand-text)] focus-visible:outline-none"
              >
                {showPassword ? 'Hide password' : 'Show password'}
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-[var(--brand-radius-dense)] border border-[var(--brand-danger)]/30 bg-[var(--brand-danger-subtle)] px-3 py-2.5"
              >
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-danger)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-sm text-[var(--brand-danger)]">{error}</p>
              </div>
            )}

            <Button type="submit" fullWidth loading={loading} size="md">
              {loading ? 'Signing in…' : 'Sign in'}
              {!loading && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-[var(--brand-dim)]">
            Fallback credentials: <code className="rounded bg-[var(--brand-navy)] px-1 py-0.5 font-mono text-[var(--brand-muted)]">local / local</code> when enabled on the server.
          </p>
        </div>
      </div>
    </div>
  );
}
