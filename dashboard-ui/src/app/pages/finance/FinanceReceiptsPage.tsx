import { useEffect, useRef, useState } from 'react';
import { Card } from '../../components/design-system/Card';
import { Button } from '../../components/design-system/Button';
import { Input } from '../../components/design-system/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/design-system/Table';
import { functionsBase, getAuthHeaders, jsonFetch } from '../../../lib/api';
import { fmtFull, egpInWords, type ReceiptItem } from './_shared';

const METHODS = ['cash', 'bank transfer', 'card', 'cheque'];

export function FinanceReceiptsPage() {
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [issuedReceipt, setIssuedReceipt] = useState<ReceiptItem | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    enrollment_id: '', amount: '', payer_name: '', method: 'cash', cheque_number: '', notes: '',
  });

  const loadReceipts = async () => {
    setLoading(true);
    try {
      const d = await jsonFetch<{ items: ReceiptItem[] }>(`${functionsBase()}/finance-data?resource=receipts&pageSize=20`, { headers: getAuthHeaders() });
      setReceipts(d.items || []);
    } catch (_) { setReceipts([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadReceipts(); }, []);

  const issue = async () => {
    setMsg('');
    if (!form.amount || Number(form.amount) <= 0) { setMsg('A positive amount is required.'); return; }
    try {
      const body: Record<string, unknown> = {
        amount: Number(form.amount),
        method: form.method,
        payer_name: form.payer_name.trim() || undefined,
        cheque_number: form.cheque_number.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      if (form.enrollment_id.trim()) body.enrollment_id = form.enrollment_id.trim();
      const d = await jsonFetch<{ ok: boolean; item: ReceiptItem }>(`${functionsBase()}/finance-data?resource=receipt`, {
        method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(body),
      });
      setIssuedReceipt(d.item);
      setReceipts((prev) => [d.item, ...prev]);
      setForm({ enrollment_id: '', amount: '', payer_name: '', method: 'cash', cheque_number: '', notes: '' });
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Failed to issue receipt'); }
  };

  const print = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank', 'width=700,height=600');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Cash Receipt</title><style>
      body{font-family:Arial,sans-serif;padding:30px;color:#000;direction:ltr}
      .receipt{max-width:640px;margin:0 auto;border:2px solid #000;padding:24px}
      .header{text-align:center;margin-bottom:16px;font-size:18px;font-weight:bold}
      .row{display:flex;justify-content:space-between;margin:8px 0;font-size:13px}
      .label{font-weight:bold;min-width:160px}.value{flex:1;border-bottom:1px dotted #000;padding-left:8px}
      .amount-words{font-size:14px;font-weight:bold;margin:12px 0;padding:8px;border:1px solid #000}
      .sigs{display:flex;gap:32px;margin-top:40px}
      .sig{flex:1;text-align:center}.sig-line{border-bottom:1px solid #000;height:40px;margin-bottom:4px}
      .sig-label{font-size:11px;color:#555}
      @media print{body{padding:0}button{display:none}}
    </style></head><body>${content}</body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="space-y-5">
      {msg && <p className="rounded-lg border border-[var(--brand-danger)]/30 bg-[var(--brand-danger)]/10 px-3 py-2 text-sm text-[var(--brand-danger)]">{msg}</p>}

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Issue form */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-[var(--brand-text)]">Issue New Receipt</h3>
            <div className="space-y-3">
              <Input label="Enrollment ID (optional)" value={form.enrollment_id} onChange={(e) => setForm((p) => ({ ...p, enrollment_id: e.target.value }))} placeholder="Link to enrollment" />
              <Input label="Amount (EGP)" type="number" min="0" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Payer name</label>
                <input dir="auto" value={form.payer_name} onChange={(e) => setForm((p) => ({ ...p, payer_name: e.target.value }))}
                  placeholder="Arabic or English name"
                  className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)] placeholder:text-[var(--brand-dim)]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--brand-muted)]">Payment method</label>
                <select value={form.method} onChange={(e) => setForm((p) => ({ ...p, method: e.target.value }))}
                  className="w-full rounded-[var(--brand-radius-dense)] border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2 text-sm text-[var(--brand-text)]">
                  {METHODS.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                </select>
              </div>
              {form.method === 'cheque' && (
                <Input label="Cheque number" value={form.cheque_number} onChange={(e) => setForm((p) => ({ ...p, cheque_number: e.target.value }))} />
              )}
              <Input label="Notes (optional)" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
              <Button type="button" size="sm" className="w-full" onClick={() => void issue()} disabled={!form.amount || Number(form.amount) <= 0}>
                Issue Receipt
              </Button>
            </div>
          </Card>

          {/* Print preview */}
          {issuedReceipt && (
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--brand-text)]">Receipt #{issuedReceipt.serial_number}</h3>
                <Button type="button" size="sm" variant="secondary" onClick={print}>Print</Button>
              </div>
              <div ref={printRef}>
                <div className="receipt">
                  <div className="header">SBS — Cash Receipt</div>
                  <div className="row"><span className="label">Serial #</span><span className="value">{issuedReceipt.serial_number}</span></div>
                  <div className="row"><span className="label">Date</span><span className="value">{new Date(issuedReceipt.issued_at).toLocaleDateString('en-GB')}</span></div>
                  <div className="row"><span className="label">Received from</span><span className="value" dir="auto">{issuedReceipt.payer_name || '—'}</span></div>
                  <div className="row"><span className="label">Amount</span><span className="value">{fmtFull(issuedReceipt.amount)}</span></div>
                  <div className="amount-words">{egpInWords(issuedReceipt.amount)}</div>
                  <div className="row"><span className="label">Method</span><span className="value">{issuedReceipt.method}</span></div>
                  <div className="row"><span className="label">Issued by</span><span className="value">{issuedReceipt.issued_by}</span></div>
                  <div className="sigs">
                    <div className="sig"><div className="sig-line" /><div className="sig-label">Payer signature</div></div>
                    <div className="sig"><div className="sig-line" /><div className="sig-label">Accountant signature</div></div>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Receipts history */}
        <div className="lg:col-span-3">
          <Card noPadding>
            <div className="flex items-center justify-between border-b border-[var(--brand-border)] px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--brand-text)]">Issued Receipts</h3>
                <p className="text-xs text-[var(--brand-muted)]">Most recent 20</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => void loadReceipts()}>Refresh</Button>
            </div>
            {loading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-[var(--brand-surface-2)]" />)}
              </div>
            ) : receipts.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--brand-muted)]">No receipts issued yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Payer</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs font-medium text-[var(--brand-primary-2)]">{r.serial_number}</TableCell>
                      <TableCell className="text-xs text-[var(--brand-muted)]">{r.issued_at?.slice(0, 10)}</TableCell>
                      <TableCell className="text-sm text-[var(--brand-text)]" dir="auto">{r.payer_name || '—'}</TableCell>
                      <TableCell className="text-xs capitalize text-[var(--brand-muted)]">{r.method}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-[var(--brand-success)]">{fmtFull(r.amount)}</TableCell>
                      <TableCell className="text-xs text-[var(--brand-muted)]">{r.issued_by}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
