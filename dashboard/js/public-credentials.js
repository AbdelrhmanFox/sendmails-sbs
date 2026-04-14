import { jsonFetch, showToast } from './shared.js';

function byId(id) {
  return document.getElementById(id);
}

function buildShareUrl(token) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}?credential=${encodeURIComponent(token)}`;
}

async function notifyShare(token, channel) {
  try {
    await jsonFetch('/.netlify/functions/credential-public?resource=share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, channel }),
    });
  } catch (_) {
    // Avoid blocking share UX on telemetry failures.
  }
}

function renderCredential(data, status) {
  const card = byId('publicCredentialCard');
  if (!card) return;
  card.innerHTML = `
    <h3>${data.certificate_no || 'Credential'}</h3>
    <p class="muted">Status: <strong>${status}</strong></p>
    <p>Course: ${data.course_id || '—'}</p>
    <p>Trainee: ${data.trainee_id || '—'}</p>
    <p>Issued: ${data.issued_at ? new Date(data.issued_at).toLocaleString() : '—'}</p>
  `;
}

export async function initPublicCredential(token) {
  const msg = byId('publicCredentialMsg');
  if (!token) {
    if (msg) msg.textContent = 'Missing credential token.';
    return;
  }
  try {
    const data = await jsonFetch(`/.netlify/functions/credential-public?resource=verify&token=${encodeURIComponent(token)}`);
    renderCredential(data.credential, data.verify_status);
    if (msg) msg.textContent = '';
    const shareUrl = buildShareUrl(token);
    byId('publicCredentialShareLink')?.setAttribute('data-link', shareUrl);
    byId('publicCredentialOpenProfile')?.setAttribute(
      'href',
      `?learner=${encodeURIComponent(data.credential.learner_slug || data.credential.trainee_id || '')}`,
    );
  } catch (err) {
    if (msg) msg.textContent = err.message || 'Could not verify credential.';
  }
}

export async function initPublicLearnerProfile(slug) {
  const host = byId('publicLearnerProfileCard');
  if (!host) return;
  if (!slug) {
    host.innerHTML = '<p class="muted">Missing learner slug.</p>';
    return;
  }
  try {
    const data = await jsonFetch(`/.netlify/functions/credential-public?resource=learner-profile&slug=${encodeURIComponent(slug)}`);
    const cards = (data.credentials || [])
      .map(
        (x) => `<li><a href="?credential=${encodeURIComponent(x.verification_token)}">${x.certificate_no}</a> — ${x.course_id} (${x.status})</li>`,
      )
      .join('');
    host.innerHTML = `
      <h3>${data.profile.display_name || data.profile.trainee_id}</h3>
      <p class="muted">${data.profile.headline || ''}</p>
      <p>${data.profile.bio || ''}</p>
      <ul>${cards || '<li class="muted">No credentials yet.</li>'}</ul>
    `;
  } catch (err) {
    host.innerHTML = `<p class="inline-error">${err.message || 'Could not load learner profile.'}</p>`;
  }
}

export function bindPublicShareActions() {
  document.addEventListener('click', async (e) => {
    const button = e.target.closest('[data-public-share]');
    if (!button) return;
    const kind = String(button.getAttribute('data-public-share') || '').trim();
    const linkNode = byId('publicCredentialShareLink');
    const url = String(linkNode?.getAttribute('data-link') || '').trim();
    if (!url) return;

    if (kind === 'copy') {
      await navigator.clipboard.writeText(url);
      showToast('Verification link copied.', 'success');
    }
    if (kind === 'linkedin') window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
    if (kind === 'x') window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`, '_blank');
    if (kind === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    if (kind === 'email') window.location.href = `mailto:?subject=Credential verification&body=${encodeURIComponent(url)}`;
    await notifyShare(url.split('credential=')[1], kind);
  });
}
