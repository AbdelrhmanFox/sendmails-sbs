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
   - After deploy: open `https://YOUR-SITE.netlify.app/.netlify/functions/seed?key=SEED_SECRET`  
   - Or locally: `.env` + `node scripts/seed-admin.js`

Then log in with **admin** / **123** and use the "Manage users" tab to add users.

---

**Summary:** Login works from any device; admin can add users; data is stored in Supabase.
