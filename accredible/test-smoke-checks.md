# Smoke Checks

## Local runtime
1. `npm install`
2. `npm run dev`
3. Login with a staff/admin account.

## Credential center UI
1. Open Training -> Credentials.
2. Create a template.
3. Issue one credential.
4. Verify row appears with token.
5. Revoke one credential and confirm status updates.

## Bulk issuance
1. Paste sample CSV in bulk issue box:
   - `trainee_id,course_id,certificate_no`
   - `TR001,CS101,CERT-1001`
2. Submit and confirm success count > 0.

## Public verification and sharing
1. Open `/?credential=<verification_token>`.
2. Confirm credential data loads and status shows valid/revoked.
3. Click Copy link and at least one social share button.
4. Confirm no client-side errors in console.

## Learner profile wallet
1. Open `/?learner=<learner_slug>`.
2. Confirm profile details and credential list render.
3. Open a listed credential and verify page resolves.

## API smoke checks
- `GET /.netlify/functions/credential-center?resource=credentials` (auth required)
- `GET /.netlify/functions/credential-center?resource=analytics` (auth required)
- `GET /.netlify/functions/credential-public?resource=spotlight` (public)
- `GET /.netlify/functions/credential-public?resource=verify&token=<token>` (public)

## Deployment health
- Netlify: `/.netlify/functions/health-supabase`
- Vercel: `/api/health-supabase`
