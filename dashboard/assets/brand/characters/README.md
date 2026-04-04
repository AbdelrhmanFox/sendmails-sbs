# Character art for the dashboard

`brand/source/Characters.ai` cannot run in the browser. Export a raster or SVG from Illustrator, then place it here.

**Suggested first asset**

- `hero-login.png` — optional illustration on the sign-in screen (transparent PNG or WebP). Recommended max width ~900px, optimized for web.

**Operations overview**

- `ops-overview-character.png` — optional illustration beside the pipeline analytics card on **Operations → Overview** (`#view-operations-home`). Recommended max width ~280px, transparent PNG or WebP. The dashboard probes this path once at load; if the file is missing, a placeholder is shown instead (no broken image tag).

**Enable on login**

Styles live in `dashboard/css/brand-surfaces.css` (`.login-screen.login-screen--with-character::after`). `dashboard/js/app.js` adds class `login-screen--with-character` to `#login-screen` when `hero-login.png` loads successfully, so you do not need to edit HTML after export.

If the file is missing, omit that class to avoid a broken image request.
