/**
 * Ensures dashboard/classic/index.html has <base href="/"> for assets when served at /classic/.
 * Source of truth is dashboard/classic/index.html (full legacy shell). Do not read dashboard/index.html
 * here — root is a minimal bootstrap that redirects to /spa/ or /classic/.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const destDir = path.join(root, 'dashboard', 'classic');
const dest = path.join(destDir, 'index.html');

if (!fs.existsSync(dest)) {
  console.error('[copy-classic-dashboard] Missing full shell at:', dest);
  console.error('Copy the legacy dashboard HTML to dashboard/classic/index.html once, then re-run.');
  process.exit(1);
}

let html = fs.readFileSync(dest, 'utf8');
if (!html.includes('<base ')) {
  html = html.replace('<head>', '<head>\n  <base href="/" />');
}
fs.writeFileSync(dest, html, 'utf8');
console.log('[copy-classic-dashboard] Ensured <base> in', dest);
