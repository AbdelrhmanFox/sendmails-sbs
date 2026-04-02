# Supabase Setup (Current Project)

## 1) Run schema

Run the full file `supabase/schema.sql` in Supabase SQL Editor.

This creates:

- `app_users`
- `enrollments`
- `training_sessions`
- `training_groups`
- `training_participants`
- `training_messages`

and related RLS policies for training public join/chat flows.

## 2) Netlify environment variables

Set these in Netlify:

| Name | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` (or `SUPABASE_PROJECT_REF`) | Yes | Supabase project connection |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side CRUD in functions |
| `SUPABASE_ANON_KEY` | Yes (recommended) | Realtime chat subscription in browser |
| `JWT_SECRET` (or `SUPABASE_JWT_SECRET`) | Yes | Auth token signing |
| `SEED_SECRET` | Optional | One-time admin seed endpoint |

## 3) Seed admin user

Local:

```bash
npm run seed:admin
```

or Netlify:

```text
/.netlify/functions/seed?key=YOUR_SEED_SECRET
```

Default admin credentials from seed: `admin / 123`.

## 4) Optional workbook import

```bash
npm run import:enrollments
```

Source file:

- `docs/excel-export/enrollments.csv`

## Troubleshooting

- `Server config missing`: missing env variables in Netlify.
- `Invalid username or password`: seed user not created in current Supabase project.
- Realtime chat not updating live: verify `SUPABASE_ANON_KEY` and training tables exist.
