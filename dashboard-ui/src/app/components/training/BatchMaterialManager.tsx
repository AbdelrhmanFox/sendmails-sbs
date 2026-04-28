import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../design-system/Button';
import { Input } from '../design-system/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';

type MaterialRow = {
  id: string;
  title: string;
  url: string;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  storage_object_key?: string | null;
};

type SignedUploadResponse = {
  signedUrl: string;
  publicUrl: string;
  path: string;
};

const ACCEPTED_FILES =
  '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.mp4,.webm,.mov,.mkv,.avi,.m4v,.mp3,.wav,.m4a,.aac,.ogg,.flac';

function bytesLabel(v?: number | null): string {
  if (v == null || Number.isNaN(Number(v))) return '';
  const n = Number(v);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 102.4) / 10} KB`;
  return `${Math.round(n / 104857.6) / 10} MB`;
}

export function BatchMaterialManager({ batchId }: { batchId: string }) {
  const [items, setItems] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyLink, setBusyLink] = useState(false);
  const [busyFile, setBusyFile] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const [fileTitle, setFileTitle] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);
  const [fileObj, setFileObj] = useState<File | null>(null);

  const canAddLink = useMemo(() => Boolean(batchId && linkTitle.trim() && linkUrl.trim()), [batchId, linkTitle, linkUrl]);
  const canUploadFile = useMemo(() => Boolean(batchId && fileTitle.trim() && fileObj), [batchId, fileTitle, fileObj]);

  const loadMaterials = useCallback(async () => {
    if (!batchId) {
      setItems([]);
      return;
    }
    setErr('');
    setLoading(true);
    try {
      const data = await jsonFetch<{ items: MaterialRow[] }>(
        `${functionsBase()}/classroom-data?resource=materials&batch_id=${encodeURIComponent(batchId)}`,
        { headers: getAuthHeaders() },
      );
      setItems(data.items || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load materials');
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    void loadMaterials();
  }, [loadMaterials]);

  const addLink = async () => {
    if (!canAddLink) return;
    setErr('');
    setMsg('');
    setBusyLink(true);
    try {
      await jsonFetch(`${functionsBase()}/classroom-data?resource=materials`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          batch_id: batchId,
          title: linkTitle.trim(),
          url: linkUrl.trim(),
        }),
      });
      setLinkTitle('');
      setLinkUrl('');
      setMsg('Link material added.');
      await loadMaterials();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not add link material');
    } finally {
      setBusyLink(false);
    }
  };

  const uploadFile = async () => {
    if (!canUploadFile || !fileObj) return;
    setErr('');
    setMsg('');
    setBusyFile(true);
    try {
      const prep = await jsonFetch<SignedUploadResponse>(`${functionsBase()}/classroom-material-upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          batch_id: batchId,
          filename: fileObj.name,
          contentType: fileObj.type || 'application/octet-stream',
        }),
      });

      const putRes = await fetch(prep.signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': fileObj.type || 'application/octet-stream' },
        body: fileObj,
      });
      if (!putRes.ok) {
        throw new Error(`File upload failed (${putRes.status})`);
      }

      await jsonFetch(`${functionsBase()}/classroom-data?resource=materials`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          batch_id: batchId,
          title: fileTitle.trim(),
          url: prep.publicUrl,
          storage_object_key: prep.path,
          mime_type: fileObj.type || null,
          file_size_bytes: fileObj.size || null,
        }),
      });
      setFileTitle('');
      setFileObj(null);
      setFileInputKey((k) => k + 1);
      setMsg('File material uploaded.');
      await loadMaterials();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not upload file material');
    } finally {
      setBusyFile(false);
    }
  };

  const removeMaterial = async (id: string) => {
    setErr('');
    setMsg('');
    try {
      await jsonFetch(`${functionsBase()}/classroom-data?resource=materials&id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not delete material');
    }
  };

  return (
    <div className="space-y-3">
      {err ? <p className="text-sm text-[var(--brand-danger)]">{err}</p> : null}
      {msg ? <p className="text-sm text-[var(--brand-text)]">{msg}</p> : null}

      <div className="grid gap-3 rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] p-3 md:grid-cols-3">
        <Input label="Link title" placeholder="Business English material" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} />
        <Input label="Link URL" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
        <div className="flex items-end">
          <Button type="button" loading={busyLink} disabled={!canAddLink} onClick={() => void addLink()}>
            Add link
          </Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] p-3 md:grid-cols-3">
        <Input label="File title" placeholder="Session slides" value={fileTitle} onChange={(e) => setFileTitle(e.target.value)} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[var(--brand-text)]">File</label>
          <input
            key={fileInputKey}
            className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-2.5 text-sm text-[var(--brand-text)]"
            type="file"
            accept={ACCEPTED_FILES}
            onChange={(e) => setFileObj(e.target.files?.[0] || null)}
          />
          <p className="mt-1 text-xs text-[var(--brand-muted)]">Allowed: docs, spreadsheets, slides, text, common video and audio formats.</p>
        </div>
        <div className="flex items-end">
          <Button type="button" loading={busyFile} disabled={!canUploadFile} onClick={() => void uploadFile()}>
            Upload file
          </Button>
        </div>
      </div>

      {loading ? <p className="text-sm text-[var(--brand-muted)]">Loading materials…</p> : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Link</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((m) => (
            <TableRow key={m.id}>
              <TableCell>{m.title}</TableCell>
              <TableCell>
                <a className="text-[var(--brand-primary)] underline" href={m.url} target="_blank" rel="noreferrer">
                  Open
                </a>
              </TableCell>
              <TableCell>{m.mime_type || (m.storage_object_key ? 'file' : 'link')}</TableCell>
              <TableCell>{bytesLabel(m.file_size_bytes) || '—'}</TableCell>
              <TableCell>
                <Button size="sm" variant="secondary" type="button" onClick={() => void removeMaterial(m.id)}>
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!loading && items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-sm text-[var(--brand-muted)]">
                No materials yet.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
