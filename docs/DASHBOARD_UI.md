# Dashboard UI (React SPA primary)

The published site now uses React as the only dashboard surface.

- Root `dashboard/index.html` redirects to `/spa/`.
- Public query parameters (`session`, `group`, `classroom`, `credential`, `learner`) are handled by the React public query router.
- Legacy classic shell files are removed from deploy artifacts.

## React app (staff primary)

- **Source:** [`dashboard-ui/`](../dashboard-ui/), built to [`dashboard/spa/`](../dashboard/spa/) with Vite `base: '/spa/'`.
- **Navigation** is defined in `dashboard-ui` routes and role guards: Operations, Training, Finance, Campaigns (automation), Admin, and trainee portal.
- **Training** and **Operations → Import** are implemented in React (no iframe). They call the same Netlify functions as legacy (`training-sessions`, `training-data`, `classroom-data`, `course-library-data`, `credential-center`, `operations-data?bulk=1`, etc.).
- **Public session links** (`?session` / `?group`) are routed through the React public entry.
- **Role visibility** is enforced by `dashboard-ui/src/lib/roleAccess.ts` and `AreaGuard`.

## Authentication and session

- Same `localStorage` keys as legacy: `sbs_token`, `sbs_role`, `sbs_username`.
- **`jsonFetch`** clears the session and sends the browser to `/spa/login` on **401** responses.

## APIs

- Shared Netlify functions under `/.netlify/functions/*` (Vercel: rewrites to `/api/*`).
- Campaigns continue to call the **client-configured n8n webhook** from the browser; webhook URL is stored in **`localStorage`** as `sbs_sendmails_webhook` (same as legacy).

## Deployment notes

- **Netlify:** [`netlify.toml`](../netlify.toml) builds the SPA then publishes `dashboard/`. Rule `/spa/*` → `/spa/index.html` (200) for client routing.
- **Vercel:** [`vercel.json`](../vercel.json) mirrors the `/spa/:path*` rewrite; static files take precedence over rewrites.

## Local development

```bash
cd dashboard-ui
npm install
npm run dev
```

Use `netlify dev` from the repo root if you need `/.netlify/functions` on the same origin as the static site.

## Legacy shell status

Legacy classic shell files under `dashboard/classic/`, `dashboard/js/`, and `dashboard/css/` are removed after parity migration.
