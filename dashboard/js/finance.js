import { jsonFetch, getAuthHeaders } from './shared.js';
import { loadFinanceAudit, getAuditPage, setAuditPage } from './admin.js';

let ledgerPage = 1;
const LEDGER_PAGE_SIZE = 50;
let financeChartRevenue = null;
let financeChartMethods = null;
let financeChartTrainees = null;
let financeChartAr = null;

function ledgerToCsv(items) {
  const headers = ['received_at', 'amount', 'currency', 'method', 'enrollment_id', 'trainee_id', 'reference'];
  const lines = [headers.join(',')];
  (items || []).forEach((row) => {
    const e = row.enrollments || {};
    const vals = [row.received_at, row.amount, row.currency, row.method, e.enrollment_id, e.trainee_id, row.reference].map((v) => {
      const s = v == null ? '' : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    });
    lines.push(vals.join(','));
  });
  return lines.join('\n');
}

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '').trim();
  if (h.length !== 6) return { r: 0, g: 169, b: 157 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbaFromCssVar(varName, alpha) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (raw.startsWith('#')) {
    const { r, g, b } = hexToRgb(raw);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return raw || `rgba(0,169,157,${alpha})`;
}

function destroyFinanceCharts() {
  if (financeChartRevenue) {
    financeChartRevenue.destroy();
    financeChartRevenue = null;
  }
  if (financeChartMethods) {
    financeChartMethods.destroy();
    financeChartMethods = null;
  }
  if (financeChartTrainees) {
    financeChartTrainees.destroy();
    financeChartTrainees = null;
  }
  if (financeChartAr) {
    financeChartAr.destroy();
    financeChartAr = null;
  }
}

async function refreshFinanceCharts() {
  const msg = document.getElementById('financeChartsMsg');
  const cRev = document.getElementById('chartRevenueTrend');
  const cMeth = document.getElementById('chartPaymentMethods');
  const cTrainees = document.getElementById('chartTraineePayments');
  const cAr = document.getElementById('chartArAging');
  if (!cRev || !cMeth || !cTrainees || !cAr) return;
  if (typeof Chart === 'undefined') {
    if (msg) msg.textContent = 'Chart library failed to load.';
    return;
  }
  destroyFinanceCharts();
  if (msg) msg.textContent = 'Loading…';
  const textColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-text').trim() || '#f4f3fb';
  const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--brand-muted').trim() || '#b4b0c8';
  const gridColor = 'rgba(180, 176, 200, 0.14)';
  const teal = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim() || '#00a99d';
  const teal2 = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary-2').trim() || '#29abe2';
  const surface = getComputedStyle(document.documentElement).getPropertyValue('--brand-surface').trim() || '#161a4f';

  try {
    const [rev, meth, byTrainee, ar] = await Promise.all([
      jsonFetch('/.netlify/functions/finance-data?resource=chart-revenue-trend&months=6', { headers: getAuthHeaders() }),
      jsonFetch('/.netlify/functions/finance-data?resource=chart-payment-methods&days=90', { headers: getAuthHeaders() }),
      jsonFetch('/.netlify/functions/finance-data?resource=chart-payments-by-trainee&days=365', { headers: getAuthHeaders() }),
      jsonFetch('/.netlify/functions/finance-data?resource=ar-aging', { headers: getAuthHeaders() }),
    ]);

    financeChartRevenue = new Chart(cRev, {
      type: 'line',
      data: {
        labels: rev.labels || [],
        datasets: [
          {
            label: `Revenue (${rev.currency || 'EGP'})`,
            data: rev.values || [],
            borderColor: teal,
            backgroundColor: rgbaFromCssVar('--brand-primary', 0.18),
            fill: true,
            tension: 0.3,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { labels: { color: textColor } },
          tooltip: {
            callbacks: {
              label(ctx) {
                const v = ctx.parsed.y;
                return `${ctx.dataset.label}: ${Number(v).toFixed(2)}`;
              },
            },
          },
        },
        scales: {
          x: { ticks: { color: mutedColor, maxRotation: 45 }, grid: { color: gridColor } },
          y: { ticks: { color: mutedColor }, grid: { color: gridColor } },
        },
      },
    });

    const mLabels = meth.labels || [];
    const mVals = meth.values || [];
    const sumM = mVals.reduce((a, b) => a + Number(b || 0), 0);
    const pal = [teal, teal2, '#f7931e', '#39b54a', '#ed1c24', '#2e3192', '#f59e3b', '#0071bc', '#b4b0c8'];
    if (!sumM || !mLabels.length) {
      financeChartMethods = new Chart(cMeth, {
        type: 'doughnut',
        data: {
          labels: ['No data'],
          datasets: [{ data: [1], backgroundColor: ['rgba(180,176,200,0.22)'], borderColor: surface, borderWidth: 1 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
          },
        },
      });
    } else {
      financeChartMethods = new Chart(cMeth, {
        type: 'doughnut',
        data: {
          labels: mLabels,
          datasets: [
            {
              data: mVals,
              backgroundColor: mLabels.map((_, i) => pal[i % pal.length]),
              borderWidth: 1,
              borderColor: surface,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: textColor, boxWidth: 12, padding: 10, font: { size: 11 } },
            },
            tooltip: {
              callbacks: {
                label(ctx) {
                  const v = Number(ctx.parsed);
                  const pct = sumM ? ((v / sumM) * 100).toFixed(1) : '0';
                  return `${ctx.label}: ${v.toFixed(2)} (${pct}%)`;
                },
              },
            },
          },
        },
      });
    }

    const tLabels = byTrainee.labels || [];
    const tVals = byTrainee.values || [];
    const sumT = tVals.reduce((a, b) => a + Number(b || 0), 0);
    if (!sumT || !tLabels.length) {
      financeChartTrainees = new Chart(cTrainees, {
        type: 'bar',
        data: {
          labels: ['No payment rows'],
          datasets: [
            {
              label: `Total (${byTrainee.currency || 'EGP'})`,
              data: [0],
              backgroundColor: 'rgba(180,176,200,0.22)',
              borderColor: surface,
              borderWidth: 1,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
          },
          scales: { x: { display: false }, y: { display: false } },
        },
      });
    } else {
      financeChartTrainees = new Chart(cTrainees, {
        type: 'bar',
        data: {
          labels: tLabels,
          datasets: [
            {
              label: `Paid (${byTrainee.currency || 'EGP'})`,
              data: tVals,
              backgroundColor: rgbaFromCssVar('--brand-primary', 0.75),
              borderColor: surface,
              borderWidth: 1,
            },
          ],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label(ctx) {
                  return `${Number(ctx.parsed.x).toFixed(2)} ${byTrainee.currency || 'EGP'}`;
                },
              },
            },
          },
          scales: {
            x: { ticks: { color: mutedColor }, grid: { color: gridColor } },
            y: { ticks: { color: mutedColor, autoSkip: false, font: { size: 10 } }, grid: { display: false } },
          },
        },
      });
    }

    const b = ar.buckets || {};
    const arLabels = ['0–30 days', '31–60 days', '61–90 days', '90+ days'];
    const arVals = [Number(b.b0_30 || 0), Number(b.b31_60 || 0), Number(b.b61_90 || 0), Number(b.b90p || 0)];
    financeChartAr = new Chart(cAr, {
      type: 'bar',
      data: {
        labels: arLabels,
        datasets: [
          {
            label: `Outstanding (${ar.currency || 'EGP'})`,
            data: arVals,
            backgroundColor: [
              rgbaFromCssVar('--brand-primary', 0.85),
              rgbaFromCssVar('--brand-primary-2', 0.75),
              'rgba(245, 158, 59, 0.85)',
              'rgba(237, 28, 36, 0.85)',
            ],
            borderColor: surface,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(ctx) {
                return `${Number(ctx.parsed.y).toFixed(2)} ${ar.currency || 'EGP'}`;
              },
            },
          },
        },
        scales: {
          x: { ticks: { color: mutedColor }, grid: { display: false } },
          y: { ticks: { color: mutedColor }, grid: { color: gridColor } },
        },
      },
    });

    const asOf = ar.as_of ? String(ar.as_of).slice(0, 10) : '';
    if (msg) msg.textContent = asOf ? `Charts updated. AR aging as of ${asOf}.` : 'Charts updated.';
  } catch (e) {
    destroyFinanceCharts();
    if (msg) msg.textContent = e.message || 'Could not load charts.';
  }
}

async function refreshFinanceKpis() {
  const box = document.getElementById('financeKpis');
  if (!box) return;
  try {
    const data = await jsonFetch('/.netlify/functions/finance-data?resource=kpis', { headers: getAuthHeaders() });
    box.innerHTML = `
        <div class="stat"><span class="k">MTD revenue</span><span class="v">${Number(data.mtd_revenue || 0).toFixed(2)}</span></div>
        <div class="stat"><span class="k">Outstanding invoices</span><span class="v">${Number(data.outstanding_invoices || 0).toFixed(2)}</span></div>
        <div class="stat"><span class="k">Payment rows</span><span class="v">${data.payment_count ?? 0}</span></div>
      `;
  } catch (_) {
    box.textContent = '';
  }
}

function buildLedgerQuery(extra) {
  const page = extra && extra.page != null ? String(extra.page) : String(ledgerPage);
  const pageSize = extra && extra.pageSize != null ? String(extra.pageSize) : String(LEDGER_PAGE_SIZE);
  const q = new URLSearchParams({ resource: 'ledger', page, pageSize });
  const from = document.getElementById('ledgerFrom')?.value;
  const to = document.getElementById('ledgerTo')?.value;
  const method = String(document.getElementById('ledgerMethod')?.value || '').trim();
  const enrollmentId = String(document.getElementById('ledgerEnrollmentId')?.value || '').trim();
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  if (method) q.set('method', method);
  if (enrollmentId) q.set('enrollment_id', enrollmentId);
  return q.toString();
}

async function refreshLedger() {
  const body = document.getElementById('ledgerBody');
  const msg = document.getElementById('financeLedgerMsg');
  const pageInfo = document.getElementById('ledgerPageInfo');
  if (!body) return;
  try {
    const data = await jsonFetch(`/.netlify/functions/finance-data?${buildLedgerQuery()}`, { headers: getAuthHeaders() });
    body.innerHTML = (data.items || [])
      .map((row) => {
        const e = row.enrollments || {};
        return `<tr><td>${row.received_at || ''}</td><td>${row.amount ?? ''}</td><td>${row.method ?? ''}</td><td>${e.enrollment_id ?? ''}</td><td>${e.trainee_id ?? ''}</td><td>${row.reference ?? ''}</td></tr>`;
      })
      .join('');
    const total = data.total != null ? data.total : 0;
    const pages = Math.max(1, Math.ceil(total / LEDGER_PAGE_SIZE));
    if (pageInfo) pageInfo.textContent = `Page ${data.page || ledgerPage} of ${pages} (${total} rows)`;
    if (msg) msg.textContent = `Showing ${(data.items || []).length} of ${total}.`;
  } catch (err) {
    if (msg) msg.textContent = err.message;
  }
}

async function refreshAr() {
  const box = document.getElementById('arBuckets');
  const msg = document.getElementById('financeArMsg');
  if (!box) return;
  try {
    const data = await jsonFetch('/.netlify/functions/finance-data?resource=ar-aging', { headers: getAuthHeaders() });
    const b = data.buckets || {};
    box.innerHTML = `
        <div class="stat"><span class="k">0–30 d</span><span class="v">${Number(b.b0_30 || 0).toFixed(2)}</span></div>
        <div class="stat"><span class="k">31–60 d</span><span class="v">${Number(b.b31_60 || 0).toFixed(2)}</span></div>
        <div class="stat"><span class="k">61–90 d</span><span class="v">${Number(b.b61_90 || 0).toFixed(2)}</span></div>
        <div class="stat"><span class="k">90+ d</span><span class="v">${Number(b.b90p || 0).toFixed(2)}</span></div>
      `;
    if (msg) msg.textContent = `As of ${data.as_of || ''}`;
  } catch (err) {
    if (msg) msg.textContent = err.message;
  }
}

let ledgerItemsCache = [];

async function refreshInvoices() {
  const tbody = document.getElementById('invoicesBody');
  const msg = document.getElementById('financeInvMsg');
  const role = localStorage.getItem('sbs_role') || 'user';
  const canWrite = ['admin', 'accountant'].includes(role);
  if (!tbody) return;
  try {
    const data = await jsonFetch('/.netlify/functions/finance-data?resource=invoices', { headers: getAuthHeaders() });
    ledgerItemsCache = data.items || [];
    tbody.innerHTML = (data.items || [])
      .map((inv) => {
        const del = canWrite ? `<button type="button" class="btn btn-secondary btn-inv-del" data-id="${inv.id}">Delete</button>` : '';
        return `<tr>
            <td>${inv.invoice_number || ''}</td>
            <td>${inv.status || ''}</td>
            <td>${inv.issue_date || ''}</td>
            <td>${inv.due_date || ''}</td>
            <td>${inv.total ?? ''}</td>
            <td><button type="button" class="btn btn-secondary btn-inv-edit" data-id="${inv.id}">Edit</button> ${del}</td>
          </tr>`;
      })
      .join('');
    tbody.querySelectorAll('.btn-inv-edit').forEach((btn) => {
      btn.addEventListener('click', () => fillInvoiceForm(btn.getAttribute('data-id')));
    });
    tbody.querySelectorAll('.btn-inv-del').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!id || !confirm('Delete this invoice?')) return;
        await jsonFetch(`/.netlify/functions/finance-data?resource=invoices&id=${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        refreshInvoices();
      });
    });
    if (msg) msg.textContent = '';
  } catch (err) {
    if (msg) msg.textContent = err.message;
  }
}

function clearInvoiceLinesEditor() {
  const el = document.getElementById('invoiceLinesEditor');
  if (el) el.innerHTML = '';
}

function addInvoiceLineRow(line) {
  const el = document.getElementById('invoiceLinesEditor');
  if (!el) return;
  const row = document.createElement('div');
  row.className = 'invoice-line-row row';
  const d = line || {};
  row.innerHTML = `
      <input type="text" class="inv-line-desc" placeholder="Description" value="${String(d.description || '').replace(/"/g, '&quot;')}" />
      <input type="number" class="inv-line-qty" placeholder="Qty" step="any" value="${d.quantity != null ? d.quantity : '1'}" />
      <input type="number" class="inv-line-price" placeholder="Unit price" step="0.01" value="${d.unit_price != null ? d.unit_price : ''}" />
      <input type="number" class="inv-line-total" placeholder="Line total" step="0.01" value="${d.line_total != null ? d.line_total : ''}" />
      <input type="text" class="inv-line-enrollment-uuid" placeholder="Enrollment UUID (optional)" value="${String(d.enrollment_uuid || '').replace(/"/g, '&quot;')}" />
    `;
  el.appendChild(row);
}

function collectInvoiceLines() {
  const rows = document.querySelectorAll('#invoiceLinesEditor .invoice-line-row');
  const lines = [];
  rows.forEach((row) => {
    const description = row.querySelector('.inv-line-desc')?.value;
    const quantity = row.querySelector('.inv-line-qty')?.value;
    const unit_price = row.querySelector('.inv-line-price')?.value;
    const line_total = row.querySelector('.inv-line-total')?.value;
    const enrollment_uuid = row.querySelector('.inv-line-enrollment-uuid')?.value;
    if (!String(description || '').trim() && !String(line_total || '').trim()) return;
    lines.push({
      description: description != null ? String(description) : null,
      quantity: quantity !== '' && quantity != null ? Number(quantity) : 1,
      unit_price: unit_price !== '' && unit_price != null ? Number(unit_price) : null,
      line_total: line_total !== '' && line_total != null ? Number(line_total) : null,
      enrollment_uuid: enrollment_uuid ? String(enrollment_uuid).trim() || null : null,
    });
  });
  return lines;
}

function fillInvoiceForm(id) {
  const inv = ledgerItemsCache.find((x) => String(x.id) === String(id));
  if (!inv) return;
  document.getElementById('invEditId').value = inv.id;
  document.getElementById('invNumber').value = inv.invoice_number || '';
  document.getElementById('invStatus').value = inv.status || 'draft';
  document.getElementById('invIssue').value = inv.issue_date || '';
  document.getElementById('invDue').value = inv.due_date || '';
  document.getElementById('invTotal').value = inv.total != null ? inv.total : '';
  document.getElementById('invNotes').value = inv.notes || '';
  clearInvoiceLinesEditor();
  const ils = inv.invoice_lines || [];
  if (ils.length) ils.forEach((ln) => addInvoiceLineRow(ln));
  else addInvoiceLineRow(null);
}

export function refreshFinanceAll() {
  refreshFinanceKpis();
  refreshLedger();
  refreshAr();
  refreshInvoices();
  refreshFinanceCharts();
}

export function initFinance() {
  document.getElementById('btnRefreshFinance')?.addEventListener('click', refreshFinanceAll);
  document.getElementById('btnRefreshFinanceCharts')?.addEventListener('click', refreshFinanceCharts);
  document.getElementById('btnLoadLedger')?.addEventListener('click', () => {
    ledgerPage = 1;
    refreshLedger();
  });
  document.getElementById('btnLoadAr')?.addEventListener('click', refreshAr);
  document.getElementById('btnLoadInvoices')?.addEventListener('click', refreshInvoices);

  document.getElementById('btnExportLedgerCsv')?.addEventListener('click', async () => {
    try {
      const q = buildLedgerQuery({ page: '1', pageSize: '500' });
      const data = await jsonFetch(`/.netlify/functions/finance-data?${q}`, { headers: getAuthHeaders() });
      const csv = ledgerToCsv(data.items || []);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'payments-ledger.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (_) {
      /* ignore */
    }
  });

  document.getElementById('btnExportLedgerXlsx')?.addEventListener('click', async () => {
    if (typeof XLSX === 'undefined') return;
    try {
      const q = buildLedgerQuery({ page: '1', pageSize: '500' });
      const data = await jsonFetch(`/.netlify/functions/finance-data?${q}`, { headers: getAuthHeaders() });
      const rows = [['received_at', 'amount', 'currency', 'method', 'enrollment_id', 'trainee_id', 'reference']];
      (data.items || []).forEach((row) => {
        const e = row.enrollments || {};
        rows.push([row.received_at, row.amount, row.currency, row.method, e.enrollment_id, e.trainee_id, row.reference]);
      });
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ledger');
      XLSX.writeFile(wb, 'payments-ledger.xlsx');
    } catch (_) {
      /* ignore */
    }
  });

  document.getElementById('btnLedgerPrev')?.addEventListener('click', () => {
    if (ledgerPage > 1) {
      ledgerPage -= 1;
      refreshLedger();
    }
  });
  document.getElementById('btnLedgerNext')?.addEventListener('click', () => {
    ledgerPage += 1;
    refreshLedger();
  });
  ['ledgerFrom', 'ledgerTo', 'ledgerMethod', 'ledgerEnrollmentId'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => {
      ledgerPage = 1;
      refreshLedger();
    });
  });

  document.getElementById('btnAuditPrev')?.addEventListener('click', () => {
    const p = getAuditPage();
    if (p > 1) {
      setAuditPage(p - 1);
      loadFinanceAudit();
    }
  });
  document.getElementById('btnAuditNext')?.addEventListener('click', () => {
    setAuditPage(getAuditPage() + 1);
    loadFinanceAudit();
  });
  document.getElementById('btnAuditRefresh')?.addEventListener('click', loadFinanceAudit);

  document.getElementById('btnAddInvoiceLine')?.addEventListener('click', () => addInvoiceLineRow(null));

  document.getElementById('financePaymentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('financePayMsg');
    const enrollment_id = String(document.getElementById('payEnrollmentId').value || '').trim();
    const amount = Number(document.getElementById('payAmount').value);
    const method = String(document.getElementById('payMethod').value || '').trim();
    const receivedRaw = document.getElementById('payReceived').value;
    const reference = String(document.getElementById('payRef').value || '').trim();
    const notes = String(document.getElementById('payNotes').value || '').trim();
    const body = { enrollment_id, amount, method, reference, notes };
    if (receivedRaw) body.received_at = new Date(receivedRaw).toISOString();
    try {
      await jsonFetch('/.netlify/functions/finance-data?resource=payment', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (msg) msg.textContent = 'Payment saved.';
      document.getElementById('financePaymentForm').reset();
      refreshFinanceAll();
    } catch (err) {
      if (msg) msg.textContent = err.message;
    }
  });

  document.getElementById('invoiceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('financeInvMsg');
    const id = String(document.getElementById('invEditId').value || '').trim();
    const payload = {
      invoice_number: String(document.getElementById('invNumber').value || '').trim(),
      status: String(document.getElementById('invStatus').value || 'draft'),
      issue_date: String(document.getElementById('invIssue').value || ''),
      due_date: String(document.getElementById('invDue').value || '') || null,
      total: document.getElementById('invTotal').value ? Number(document.getElementById('invTotal').value) : null,
      notes: String(document.getElementById('invNotes').value || '').trim(),
      lines: collectInvoiceLines(),
    };
    try {
      if (id) {
        payload.id = id;
        await jsonFetch('/.netlify/functions/finance-data?resource=invoices', {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
      } else {
        await jsonFetch('/.netlify/functions/finance-data?resource=invoices', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
      }
      document.getElementById('invEditId').value = '';
      document.getElementById('invoiceForm').reset();
      clearInvoiceLinesEditor();
      addInvoiceLineRow(null);
      if (msg) msg.textContent = 'Invoice saved.';
      refreshInvoices();
      refreshFinanceKpis();
      refreshAr();
      refreshFinanceCharts();
    } catch (err) {
      if (msg) msg.textContent = err.message;
    }
  });

  document.getElementById('btnClearInvoiceForm')?.addEventListener('click', () => {
    document.getElementById('invEditId').value = '';
    document.getElementById('invoiceForm').reset();
    clearInvoiceLinesEditor();
    addInvoiceLineRow(null);
  });

  clearInvoiceLinesEditor();
  addInvoiceLineRow(null);
}
