import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type TrainingSession = {
  id: string;
  title: string | null;
  voice_room_url?: string | null;
  whiteboard_enabled?: boolean | null;
};

type TrainingGroup = { id: string; group_number: number; join_token: string };

type CreateResponse = { ok?: boolean; session: TrainingSession; groups: TrainingGroup[] };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function TrainingSessionCreateModal({ open, onOpenChange, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [groupsCount, setGroupsCount] = useState(1);
  const [whiteboardEnabled, setWhiteboardEnabled] = useState(true);
  const [voiceRoomUrl, setVoiceRoomUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setLoading(true);
    setErr('');
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        groupsCount: Math.max(1, Math.min(12, Number(groupsCount) || 1)),
        whiteboardEnabled,
      };
      const v = voiceRoomUrl.trim();
      if (v) body.voiceRoomUrl = v;
      await jsonFetch<CreateResponse>(`${functionsBase()}/training-sessions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      setTitle('');
      setVoiceRoomUrl('');
      setGroupsCount(1);
      setWhiteboardEnabled(true);
      onCreated();
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New training session</DialogTitle>
        </DialogHeader>
        {err ? <p className="text-sm text-[var(--brand-danger)]">{err}</p> : null}
        <div className="grid gap-3">
          <Input label="Session title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Week 3 workshop" />
          <Input
            label="Number of groups (1–12)"
            type="number"
            min={1}
            max={12}
            value={String(groupsCount)}
            onChange={(e) => setGroupsCount(Number(e.target.value))}
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--brand-text)]">
            <input type="checkbox" checked={whiteboardEnabled} onChange={(e) => setWhiteboardEnabled(e.target.checked)} className="rounded border-[var(--brand-border)]" />
            Enable shared whiteboard
          </label>
          <Input
            label="Voice room URL (optional)"
            value={voiceRoomUrl}
            onChange={(e) => setVoiceRoomUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <DialogFooter>
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" loading={loading} onClick={() => void submit()} disabled={!title.trim()}>
            Create session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
