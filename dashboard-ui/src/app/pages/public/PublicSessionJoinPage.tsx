import { Card } from '../../components/design-system/Card';

export function PublicSessionJoinPage({ sessionId, groupToken }: { sessionId?: string; groupToken?: string }) {
  const query = sessionId ? `session=${encodeURIComponent(sessionId)}` : `group=${encodeURIComponent(groupToken || '')}`;
  const src = `/classic/index.html?${query}`;

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        <h1 className="text-xl font-semibold text-[var(--brand-text)]">Live session</h1>
        <p className="text-sm text-[var(--brand-muted)]">
          This session keeps the full legacy live features (name-based join, group picker, chat, whiteboard, voice, stickers, mute, join notifications)
          while remaining accessible from the new public route.
        </p>
      </Card>
      <div className="overflow-hidden rounded-[var(--brand-radius)] border border-[var(--brand-border)] bg-white shadow-[var(--brand-shadow-soft)]">
        <iframe title="Live session" src={src} className="h-[calc(100vh-220px)] w-full min-h-[700px] border-0" />
      </div>
    </div>
  );
}
