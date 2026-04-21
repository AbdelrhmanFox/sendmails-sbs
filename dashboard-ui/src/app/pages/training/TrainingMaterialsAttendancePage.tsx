import { useEffect, useMemo, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type TrainingSession = {
  id: string;
  title: string | null;
  training_groups?: { id: string; group_number?: number }[] | null;
};

type Material = { id: string; title: string; url: string; sort_order?: number };
type AttRow = { id: string; participant_name: string; attendance_date: string; status: string };

export function TrainingMaterialsAttendancePage() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [attendance, setAttendance] = useState<AttRow[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const data = await jsonFetch<{ sessions: TrainingSession[] }>(`${functionsBase()}/training-sessions`, {
          headers: getAuthHeaders(),
        });
        if (!c) setSessions(data.sessions || []);
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : 'Failed to load sessions');
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const groups = useMemo(() => {
    const s = sessions.find((x) => x.id === sessionId);
    return Array.isArray(s?.training_groups) ? s.training_groups : [];
  }, [sessions, sessionId]);

  useEffect(() => {
    setGroupId('');
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setMaterials([]);
      return;
    }
    let c = false;
    (async () => {
      setErr('');
      try {
        const data = await jsonFetch<{ items: Material[] }>(
          `${functionsBase()}/training-data?resource=materials&session_id=${encodeURIComponent(sessionId)}`,
          { headers: getAuthHeaders() },
        );
        if (!c) setMaterials(data.items || []);
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : 'Could not load materials');
      }
    })();
    return () => {
      c = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!groupId) {
      setAttendance([]);
      return;
    }
    let c = false;
    (async () => {
      setErr('');
      try {
        const data = await jsonFetch<{ items: AttRow[] }>(
          `${functionsBase()}/training-data?resource=attendance&group_id=${encodeURIComponent(groupId)}`,
          { headers: getAuthHeaders() },
        );
        if (!c) setAttendance(data.items || []);
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : 'Could not load attendance');
      }
    })();
    return () => {
      c = true;
    };
  }, [groupId]);

  const addMaterial = async () => {
    if (!sessionId || !newTitle.trim() || !newUrl.trim()) return;
    setErr('');
    try {
      await jsonFetch(`${functionsBase()}/training-data?resource=materials`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ session_id: sessionId, group_id: groupId || null, title: newTitle.trim(), url: newUrl.trim() }),
      });
      setNewTitle('');
      setNewUrl('');
      if (sessionId) {
        const data = await jsonFetch<{ items: Material[] }>(
          `${functionsBase()}/training-data?resource=materials&session_id=${encodeURIComponent(sessionId)}`,
          { headers: getAuthHeaders() },
        );
        setMaterials(data.items || []);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Add failed');
    }
  };

  const addAttendance = async () => {
    if (!groupId || !participantName.trim()) return;
    setErr('');
    try {
      await jsonFetch(`${functionsBase()}/training-data?resource=attendance`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ group_id: groupId, participant_name: participantName.trim() }),
      });
      setParticipantName('');
      const data = await jsonFetch<{ items: AttRow[] }>(
        `${functionsBase()}/training-data?resource=attendance&group_id=${encodeURIComponent(groupId)}`,
        { headers: getAuthHeaders() },
      );
      setAttendance(data.items || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Attendance save failed');
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--brand-muted)]">Materials and attendance per live training session and group.</p>
      {err ? <p className="text-sm text-[var(--brand-danger)]">{err}</p> : null}
      {loading ? <p className="text-sm text-[var(--brand-muted)]">Loading…</p> : null}

      <Card className="space-y-3 p-4">
        <label className="block text-sm font-medium text-[var(--brand-text)]">Session</label>
        <select
          className="w-full max-w-md rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-[var(--brand-text)]"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
        >
          <option value="">Select session</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title || s.id}
            </option>
          ))}
        </select>
        <label className="block text-sm font-medium text-[var(--brand-text)]">Group (for attendance)</label>
        <select
          className="w-full max-w-md rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-[var(--brand-text)]"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          disabled={!sessionId}
        >
          <option value="">Select group</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              Group {g.group_number ?? '?'}
            </option>
          ))}
        </select>
      </Card>

      <Card className="space-y-3 p-4">
        <h3 className="text-lg font-semibold text-[var(--brand-text)]">Materials</h3>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="max-w-xs" />
          <Input placeholder="URL" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="max-w-md" />
          <Button type="button" disabled={!sessionId} onClick={() => void addMaterial()}>
            Add link
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>URL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.map((m) => (
              <TableRow key={m.id}>
                <TableCell>{m.title}</TableCell>
                <TableCell>
                  <a className="text-[var(--brand-primary)] underline" href={m.url} target="_blank" rel="noreferrer">
                    {m.url}
                  </a>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="space-y-3 p-4">
        <h3 className="text-lg font-semibold text-[var(--brand-text)]">Attendance</h3>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="Participant name" value={participantName} onChange={(e) => setParticipantName(e.target.value)} />
          <Button type="button" disabled={!groupId} onClick={() => void addAttendance()}>
            Mark present
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendance.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.participant_name}</TableCell>
                <TableCell>{String(a.attendance_date || '').slice(0, 10)}</TableCell>
                <TableCell>{a.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
