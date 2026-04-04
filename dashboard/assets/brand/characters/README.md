# Character art for the dashboard

`brand/source/Characters.ai` cannot run in the browser. Export a raster or SVG from Illustrator, then place it here.

**Suggested first asset**

- `hero-login.png` — optional illustration on the sign-in screen (transparent PNG or WebP). Recommended max width ~900px, optimized for web.

**Enable on login**

Add class `login-screen--with-character` to the `#login-screen` element in `dashboard/index.html` after the file exists. Styles live in `dashboard/css/brand-surfaces.css` (`.login-screen.login-screen--with-character::after`).

If the file is missing, omit that class to avoid a broken image request.
