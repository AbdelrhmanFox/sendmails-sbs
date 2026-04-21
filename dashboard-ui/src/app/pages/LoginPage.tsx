import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/design-system/Button';
import { Input, Select } from '../components/design-system/Input';
import { Card } from '../components/design-system/Card';
import { AUTH_ROLE, AUTH_TOKEN, AUTH_USER, functionsBase, jsonFetch } from '../../lib/api';

type LoginResponse = { token: string; role: string; username?: string };

export function LoginPage() {
  const [accountType, setAccountType] = useState('staff');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
          body: JSON.stringify({ email: String(username || '').trim(), password }),
        });
        localStorage.setItem(AUTH_TOKEN, data.token);
        localStorage.setItem(AUTH_ROLE, data.role || 'trainee');
        localStorage.setItem(AUTH_USER, data.username || String(username || '').trim());
      } else {
        const data = await jsonFetch<LoginResponse>(`${functionsBase()}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: String(username || '').trim(), password }),
        });
        localStorage.setItem(AUTH_TOKEN, data.token);
        localStorage.setItem(AUTH_ROLE, data.role || 'user');
        localStorage.setItem(AUTH_USER, data.username || String(username || '').trim());
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--brand-bg)] p-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-20 top-20 h-64 w-64 rounded-full bg-[var(--brand-primary)]/5 blur-3xl" />
        <div className="absolute bottom-20 right-20 h-96 w-96 rounded-full bg-[var(--brand-accent)]/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-[var(--brand-text)]">SBS Staff Dashboard</h1>
          <p className="text-[var(--brand-muted)]">Internal operations platform for educational services</p>
        </div>

        <Card elevated>
          <form onSubmit={handleLogin} className="space-y-5">
            <Select
              label="Account Type"
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              options={[
                { value: 'staff', label: 'Staff account' },
                { value: 'trainee', label: 'Trainee account' },
              ]}
            />

            <Input
              label={accountType === 'trainee' ? 'Email' : 'Username'}
              type={accountType === 'trainee' ? 'email' : 'text'}
              placeholder={accountType === 'trainee' ? 'Email address' : 'Username'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              }
            />

            <Input
              label="Password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              icon={
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              }
            />

            {error && (
              <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3">
                <p className="text-sm text-[var(--brand-danger)]">{error}</p>
              </div>
            )}

            <Button type="submit" fullWidth loading={loading}>
              Sign in
            </Button>

            <div className="text-center">
              <p className="text-xs text-[var(--brand-muted)]">
                Local fallback (non-production): <span className="font-semibold">local / local</span> when enabled on the server.
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
