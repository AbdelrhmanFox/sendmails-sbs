# Character art for the dashboard

`brand/source/Characters.ai` cannot run in the browser. Export a raster or SVG from Illustrator, then place it here.

**Suggested first asset**

- `hero-login.png` — optional illustration on the sign-in screen (transparent PNG or WebP). Recommended max width ~900px, optimized for web.

**Enable on login**

Styles live in `dashboard/css/brand-surfaces.css` (`.login-screen.login-screen--with-character::after`). `dashboard/js/app.js` adds class `login-screen--with-character` to `#login-screen` when `hero-login.png` loads successfully, so you do not need to edit HTML after export.

If the file is missing, omit that class to avoid a broken image request.
