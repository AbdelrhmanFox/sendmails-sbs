# Login setup (Supabase + Netlify)

## One-time step

The `app_users` table must be created in Supabase. Run this once from your browser:

1. Open **SQL Editor** for your project:  
   **https://supabase.com/dashboard/project/lpvoooyqhndizycsukcm/sql/new**

2. Paste this SQL and click **Run**:

```sql
create table if not exists app_users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password_hash text not null,
  role text not null check (role in ('admin','user')),
  created_at timestamptz default now()
);
```

3. After "Success", seed the admin user:
   - **Locally:** From project folder run `.\scripts\seed-admin.ps1` (or create `.env` from `.env.example`, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then run `node scripts/seed-admin.js`).

---

To enable login and user management:

1. **Create a Supabase project** at [supabase.com](https://supabase.com). In **Settings** → **API** copy **Project URL** and **service_role** key.

2. **Create the table** in Supabase (SQL Editor) using `supabase/schema.sql` if you have not done the step above.

3. **Add env vars in Netlify:** **Site settings** → **Environment variables**:

| Name | Value |
|------|--------|
| `SUPABASE_URL` | Project URL from Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key from Supabase |
| `JWT_SECRET` | Any long random string |
| `SEED_SECRET` | Optional; for one-time seed via URL |

4. **Create admin (admin / 123)**  
   - **On Netlify:** Add `SEED_SECRET` in env vars, redeploy, then open in browser (GET):  
     `https://YOUR-SITE.netlify.app/.netlify/functions/seed?key=YOUR_SEED_SECRET`  
   - Or locally: `.env` + `node scripts/seed-admin.js`

Then log in with **admin** / **123** and use the "Manage users" tab to add users.

---

**Login not working?**

- **"Server config missing"** → Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `JWT_SECRET` (or `SUPABASE_JWT_SECRET`) in Netlify → **Redeploy**.
- **"Invalid username or password"** → The admin user may not exist on the Supabase project that Netlify uses. Open the seed URL once (step 4 above) with the same `SEED_SECRET` you set in Netlify. Then try **admin** / **123** again.
- After changing env vars in Netlify, always **trigger a new deploy** so the functions use the new values.

---

**Summary:** Login works from any device; admin can add users; data is stored in Supabase.
