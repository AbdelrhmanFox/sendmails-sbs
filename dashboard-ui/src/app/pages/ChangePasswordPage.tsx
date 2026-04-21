import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/design-system/Card';
import { Button } from '../components/design-system/Button';
import { Input } from '../components/design-system/Input';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../lib/api';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    setOk('');
    setLoading(true);
    try {
      await jsonFetch(`${functionsBase()}/change-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setOk('Password updated. Use your new password next time you sign in.');
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => navigate(-1), 1500);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--brand-text)]">Change password</h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">Updates the password for your dashboard account in Supabase.</p>
      </div>
      <Card>
        <form className="space-y-4" onSubmit={(e) => void submit(e)}>
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="New password (min 4 characters)"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          {err ? <p className="text-sm text-[var(--brand-danger)]">{err}</p> : null}
          {ok ? <p className="text-sm text-[var(--brand-success)]">{ok}</p> : null}
          <Button type="submit" loading={loading} fullWidth>
            Update password
          </Button>
        </form>
      </Card>
    </div>
  );
}
