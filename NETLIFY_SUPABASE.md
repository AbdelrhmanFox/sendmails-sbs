# Netlify + Supabase (sbstools project)

With Netlify linked to your Supabase project (**SBsloution's Project**), these are set automatically:
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_DATABASE_URL`

## Add manually in Netlify

In **Project configuration** → **Environment variables**:

| Variable | Value |
|----------|--------|
| `SUPABASE_PROJECT_REF` | `lpvoooyqhndizycsukcm` |
| `SEED_SECRET` | A secret of your choice (e.g. `my-seed-2024`) for one-time seed |

No separate `JWT_SECRET` needed; the code uses `SUPABASE_JWT_SECRET` from the link.

## Create the table in Supabase (once)

1. Go to [Supabase](https://supabase.com) → your project → **SQL Editor**.
2. Copy the contents of **`supabase/schema.sql`** and paste into a new query.
3. Click **Run**.

## Create admin user (once after deploy)

1. After adding `SEED_SECRET` in Netlify, trigger a **Redeploy**.
2. Open (replace `YOUR_SEED_SECRET` with your value):

   **https://sbstools.netlify.app/.netlify/functions/seed?key=YOUR_SEED_SECRET**

3. If you see something like `{"ok":true,"message":"Admin created (admin / 123)"}`, the admin was created.
4. Go to **https://sbstools.netlify.app/** and log in with **admin** / **123**.

---

**Summary:** Add `SUPABASE_PROJECT_REF` and `SEED_SECRET` in Netlify → run `supabase/schema.sql` in Supabase → Redeploy → open the seed URL once → login works.
