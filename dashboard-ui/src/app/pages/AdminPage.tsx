import { useCallback, useEffect, useState } from 'react';
import { Card } from '../components/design-system/Card';
import { Button } from '../components/design-system/Button';
import { Input } from '../components/design-system/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/design-system/Table';
import { Badge } from '../components/design-system/Badge';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../lib/api';

type UserRow = { username: string; role: string };

const TABS = ['Users', 'Security', 'Config', 'Audit'] as const;
type Tab = typeof TABS[number];

const ROLE_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'neutral'> = {
  admin: 'primary', staff: 'info', trainer: 'success', accountant: 'warning', user: 'neutral',
};

export function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('Users');
  const [showCreate, setShowCreate] = useState(false);

  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState('staff');

  const [resetUser, setResetUser] = useState('');
  const [resetPass, setResetPass] = useState('');
  const [traineeEmail, setTraineeEmail] = useState('');
  const [supportNumber, setSupportNumber] = useState('');
  const [auditRows, setAuditRows] = useState<Record<string, unknown>[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
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
          jsonFetch<{ items: Record<string, unknown>[] }>(`${functionsBase()}/finance-data?resource=audit&page=1&pageSize=20`, { headers: getAuthHeaders() }),
        ]);
        setSupportNumber(String(cfg.number || ''));
        setAuditRows(audit.items || []);
      } catch (_) {}
    })();
  }, [load]);

  const createUser = async () => {
    setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/create-user`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ username: newUser.trim(), password: newPass, role: newRole }),
      });
      setMsg('User created.'); setNewUser(''); setNewPass(''); setShowCreate(false);
      void load();
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Create failed'); }
  };

  const deleteUser = async (username: string) => {
    if (!window.confirm(`Delete user "${username}"?`)) return;
    setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/delete-user`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ username }) });
      void load();
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Delete failed'); }
  };

  const resetUserPassword = async () => {
    setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/reset-password`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ username: resetUser.trim(), newPassword: resetPass }),
      });
      setMsg('Password reset.'); setResetUser(''); setResetPass('');
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Reset failed'); }
  };

  const resetTraineeAccess = async () => {
    setMsg('');
    try {
      const data = await jsonFetch<{ temporary_password: string }>(`${functionsBase()}/trainee-admin-reset`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ email: traineeEmail.trim() }),
      });
      setMsg(`Trainee access reset. Temp password: ${data.temporary_password}`);
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Trainee reset failed'); }
  };

  const saveSupportNumber = async () => {
    setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/demo-support-config`, {
        method: 'POST', headers: getAuthHeaders(),
        body: JSON.stringify({ number: supportNumber.trim() }),
      });
      setMsg('Support number saved.');
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Save failed'); }
  };

  return (
    <div className="space-y-4">
      {err && <p className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 px-3 py-2 text-sm text-[var(--brand-danger)]">{err}</p>}
      {msg && <p className="rounded-lg border border-[var(--brand-success)]/30 bg-[var(--brand-success)]/10 px-3 py-2 text-sm text-[var(--brand-success)]">{msg}</p>}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--brand-border)]">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-t-[var(--brand-radius-dense)] px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'border border-b-0 border-[var(--brand-border)] bg-[var(--brand-surface)] text-[var(--brand-primary-2)]'
                : 'text-[var(--brand-muted)] hover:text-[var(--brand-text)]'
            }`}
          >
            {tab}
            {tab === 'Users' && users.length > 0 && (
              <span className="ml-1.5 rounded-full bg-[var(--brand-surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--brand-muted)]">
                {users.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'Users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--brand-muted)]">{loading ? 'Loading users…' : `${users.length} account${users.length !== 1 ? 's' : ''}`}</p>
            <Button type="button" variant="primary" size="sm" onClick={() => setShowCreate(true)}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
              New User
            </Button>
          </div>

          <Card noPadding>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 && !loading && (
                  <TableRow><TableCell colSpan={3}><p className="text-sm text-[var(--brand-muted)]">No users found.</p></TableCell></TableRow>
                )}
                {users.map((u) => (
                  <TableRow key={u.username}>
                    <TableCell className="font-mono text-sm font-medium text-[var(--brand-text)]">{u.username}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_COLORS[u.role] ?? 'neutral'}>{u.role}</Badge>
                    </TableCell>
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
        </div>
      )}

      {activeTab === 'Security' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-[var(--brand-text)]">Reset Dashboard User Password</h3>
            <div className="space-y-3">
              <Input label="Username" value={resetUser} onChange={(e) => setResetUser(e.target.value)} />
              <Input label="New password" type="password" value={resetPass} onChange={(e) => setResetPass(e.target.value)} />
              <Button type="button" size="sm" onClick={() => void resetUserPassword()} disabled={!resetUser.trim() || !resetPass}>
                Reset Password
              </Button>
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-[var(--brand-text)]">Reset Trainee Access</h3>
            <p className="mb-3 text-xs text-[var(--brand-muted)]">Generates a new temporary password for a trainee by email.</p>
            <div className="space-y-3">
              <Input label="Trainee email" type="email" value={traineeEmail} onChange={(e) => setTraineeEmail(e.target.value)} />
              <Button type="button" size="sm" variant="secondary" onClick={() => void resetTraineeAccess()} disabled={!traineeEmail.trim()}>
                Reset Trainee Account
              </Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'Config' && (
        <Card>
          <h3 className="mb-3 text-sm font-semibold text-[var(--brand-text)]">WhatsApp Support Number</h3>
          <p className="mb-3 text-xs text-[var(--brand-muted)]">This number is used for the in-app support link in the top bar.</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 max-w-sm">
              <Input label="Number (international format)" value={supportNumber} onChange={(e) => setSupportNumber(e.target.value)} placeholder="+201234567890" />
            </div>
            <Button type="button" size="sm" onClick={() => void saveSupportNumber()} disabled={!supportNumber.trim()}>
              Save
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'Audit' && (
        <Card noPadding>
          <div className="border-b border-[var(--brand-border)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--brand-text)]">Finance Audit Log</h3>
            <p className="text-xs text-[var(--brand-muted)]">Last 20 financial events</p>
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
              {auditRows.length === 0 ? (
                <TableRow><TableCell colSpan={4}><p className="text-sm text-[var(--brand-muted)]">No audit entries.</p></TableCell></TableRow>
              ) : auditRows.map((r) => (
                <TableRow key={String(r.id)}>
                  <TableCell className="text-xs text-[var(--brand-muted)]">{String(r.created_at || '').replace('T', ' ').slice(0, 19)}</TableCell>
                  <TableCell className="font-medium text-[var(--brand-text)]">{String(r.actor || '')}</TableCell>
                  <TableCell>{String(r.action || '')}</TableCell>
                  <TableCell className="text-xs text-[var(--brand-muted)]">{String(r.entity || '')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create user modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-sm rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-[var(--brand-surface)] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] px-5 py-4">
              <h3 className="font-semibold text-[var(--brand-text)]">New User</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="text-[var(--brand-dim)] hover:text-[var(--brand-text)]">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="space-y-3 p-5">
              <Input label="Username" value={newUser} onChange={(e) => setNewUser(e.target.value)} />
              <Input label="Password" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Role</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)} className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]">
                  {['admin', 'staff', 'trainer', 'user', 'accountant'].map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--brand-border)] px-5 py-3">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="button" size="sm" onClick={() => void createUser()} disabled={!newUser.trim() || !newPass}>Create User</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
