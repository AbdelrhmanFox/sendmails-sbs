# Dashboard UI (React SPA primary)

The published site uses a **small root HTML bootstrap** (`dashboard/index.html`) that sends browsers to the correct experience:

- **No hash, site root** → redirects to **`/spa/`** (this React app).
- **Public query parameters** on the site root (`session`, `group`, `classroom`, `credential`, `learner`) → **`/spa/`** (React public query router).
- **Public participant hashes** (`public-classroom`, `public-credential`, `public-learner`) → **`/classic/index.html`** with the same hash.
- **Other hash routes** (legacy staff bookmarks such as `#/operations/operations-insights`) → **`/classic/index.html`** with the same hash.

The **legacy ES-module shell** remains at **`/classic/index.html`** for hash bookmarks and legacy hash routes only.

## React app (staff primary)

- **Source:** [`dashboard-ui/`](../dashboard-ui/), built to [`dashboard/spa/`](../dashboard/spa/) with Vite `base: '/spa/'`.
- **Navigation** mirrors [`dashboard/js/shell-routes.js`](../dashboard/js/shell-routes.js): Operations, Training, Finance, Campaigns (automation), and Admin expose nested routes.
- **Training** and **Operations → Import** are implemented in React (no iframe). They call the same Netlify functions as legacy (`training-sessions`, `training-data`, `classroom-data`, `course-library-data`, `credential-center`, `operations-data?bulk=1`, etc.).
- **Public session links** (`?session` / `?group`) are routed through the React public entry and render the legacy live session engine in-place to preserve full parity (group picker, name-first join, chat, whiteboard, voice, stickers, mute, join notifications).
- **Role visibility** follows [`dashboard/js/shared.js`](../dashboard/js/shared.js) `ROLE_AREAS` (enforced in `dashboard-ui/src/lib/roleAccess.ts` and `AreaGuard`).

## Authentication and session

- Same `localStorage` keys as legacy: `sbs_token`, `sbs_role`, `sbs_username`.
- **`jsonFetch`** clears the session and sends the browser to `/spa/login` on **401** responses.

## APIs

- Shared Netlify functions under `/.netlify/functions/*` (Vercel: rewrites to `/api/*`).
- Campaigns continue to call the **client-configured n8n webhook** from the browser; webhook URL is stored in **`localStorage`** as `sbs_sendmails_webhook` (same as legacy).

## Deployment notes

- **Netlify:** [`netlify.toml`](../netlify.toml) builds the SPA then publishes `dashboard/`. Rule `/spa/*` → `/spa/index.html` (200) for client routing. Real files under `/spa/assets/*` and **`/classic/*`** are served as static files first.
- **Vercel:** [`vercel.json`](../vercel.json) mirrors the `/spa/:path*` rewrite; static files take precedence over rewrites.

## Local development

```bash
cd dashboard-ui
npm install
npm run dev
```

Use `netlify dev` from the repo root if you need `/.netlify/functions` on the same origin as the static site.

## Classic shell maintenance

Script [`scripts/copy-classic-dashboard.mjs`](../scripts/copy-classic-dashboard.mjs) ensures `<base href="/" />` exists in `dashboard/classic/index.html`. Keep **`dashboard/classic/index.html`** in deploy artifacts until all public flows are served from dedicated React or minimal static pages; do not overwrite it from the minimal root `index.html`.
