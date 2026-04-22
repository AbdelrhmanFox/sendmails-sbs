import { useCallback, useEffect, useState } from 'react';
import { Card } from '../components/design-system/Card';
import { Button } from '../components/design-system/Button';
import { Input } from '../components/design-system/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../lib/api';

type UserRow = { username: string; role: string };

export function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState('staff');
  const [msg, setMsg] = useState('');
  const [resetUser, setResetUser] = useState('');
  const [resetPass, setResetPass] = useState('');
  const [traineeEmail, setTraineeEmail] = useState('');
  const [supportNumber, setSupportNumber] = useState('');
  const [auditRows, setAuditRows] = useState<Record<string, unknown>[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await jsonFetch<{ users: UserRow[] }>(`${functionsBase()}/list-users`, { headers: getAuthHeaders() });
      setUsers(data.users || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    (async () => {
      try {
        const [cfg, audit] = await Promise.all([
          jsonFetch<{ number?: string }>(`${functionsBase()}/demo-support-config`),
          jsonFetch<{ items: Record<string, unknown>[] }>(`${functionsBase()}/finance-data?resource=audit&page=1&pageSize=20`, {
            headers: getAuthHeaders(),
          }),
        ]);
        setSupportNumber(String(cfg.number || ''));
        setAuditRows(audit.items || []);
      } catch (_) {
        // ignore optional panels for non-admin roles
      }
    })();
  }, [load]);

  const createUser = async () => {
    setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/create-user`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ username: newUser.trim(), password: newPass, role: newRole }),
      });
      setMsg('User created.');
      setNewUser('');
      setNewPass('');
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Create failed');
    }
  };

  const deleteUser = async (username: string) => {
    if (!window.confirm(`Delete user ${username}?`)) return;
    setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/delete-user`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ username }),
      });
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const resetUserPassword = async () => {
    setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/reset-password`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ username: resetUser.trim(), newPassword: resetPass }),
      });
      setMsg('Password reset completed.');
      setResetUser('');
      setResetPass('');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Reset failed');
    }
  };

  const resetTraineeAccess = async () => {
    setMsg('');
    try {
      const data = await jsonFetch<{ temporary_password: string }>(`${functionsBase()}/trainee-admin-reset`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ email: traineeEmail.trim() }),
      });
      setMsg(`Trainee access reset. Temporary password: ${data.temporary_password}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Trainee reset failed');
    }
  };

  const saveSupportNumber = async () => {
    setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/demo-support-config`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ number: supportNumber.trim() }),
      });
      setMsg('Demo support number saved.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--brand-text)]">Admin · Users</h1>
        <p className="mt-1 text-sm text-[var(--brand-muted)]">List, create, and delete dashboard accounts</p>
      </div>
      {err ? (
        <div className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 p-3 text-sm text-[var(--brand-danger)]">
          {err}
        </div>
      ) : null}
      {msg ? <p className="text-sm text-[var(--brand-text)]">{msg}</p> : null}
      {loading ? <p className="text-sm text-[var(--brand-muted)]">Loading…</p> : null}

      <Card className="space-y-3">
        <h3 className="text-lg font-semibold text-[var(--brand-text)]">Create user</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Input label="Username" value={newUser} onChange={(e) => setNewUser(e.target.value)} />
          <Input label="Password" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--brand-text)]">Role</label>
            <select
              className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-2.5 text-[var(--brand-text)]"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            >
              {['admin', 'staff', 'trainer', 'user', 'accountant'].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Button type="button" onClick={() => void createUser()}>
          Create
        </Button>
      </Card>

      <Card noPadding>
        <div className="border-b border-[var(--brand-border)] p-4">
          <h3 className="text-lg font-semibold text-[var(--brand-text)]">Users</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.username}>
                <TableCell className="font-mono text-sm">{u.username}</TableCell>
                <TableCell>{u.role}</TableCell>
                <TableCell className="text-right">
                  <Button type="button" variant="danger" size="sm" onClick={() => void deleteUser(u.username)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="text-lg font-semibold text-[var(--brand-text)]">Reset dashboard user password</h3>
          <Input label="Username" value={resetUser} onChange={(e) => setResetUser(e.target.value)} />
          <Input label="New password" type="password" value={resetPass} onChange={(e) => setResetPass(e.target.value)} />
          <Button type="button" onClick={() => void resetUserPassword()}>
            Reset password
          </Button>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-lg font-semibold text-[var(--brand-text)]">Reset trainee access</h3>
          <Input label="Trainee email" type="email" value={traineeEmail} onChange={(e) => setTraineeEmail(e.target.value)} />
          <Button type="button" onClick={() => void resetTraineeAccess()}>
            Reset trainee account
          </Button>
        </Card>
      </div>

      <Card className="space-y-3">
        <h3 className="text-lg font-semibold text-[var(--brand-text)]">Demo WhatsApp support number</h3>
        <div className="flex max-w-xl flex-wrap items-end gap-2">
          <Input label="Number" value={supportNumber} onChange={(e) => setSupportNumber(e.target.value)} />
          <Button type="button" onClick={() => void saveSupportNumber()}>
            Save
          </Button>
        </div>
      </Card>

      <Card noPadding>
        <div className="border-b border-[var(--brand-border)] p-4">
          <h3 className="text-lg font-semibold text-[var(--brand-text)]">Finance audit (recent)</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditRows.map((r) => (
              <TableRow key={String(r.id)}>
                <TableCell>{String(r.created_at || '').replace('T', ' ').slice(0, 19)}</TableCell>
                <TableCell>{String(r.actor || '')}</TableCell>
                <TableCell>{String(r.action || '')}</TableCell>
                <TableCell>{String(r.entity || '')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
