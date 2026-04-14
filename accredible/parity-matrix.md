# Accredible Parity Matrix

| Feature | SBS Status | Gap | Owner |
| --- | --- | --- | --- |
| Template designer (certificate + badge) | Implemented (`credential_templates` + dashboard form) | Advanced drag-and-drop designer still pending | Product + Frontend |
| Manual issuance | Implemented (`credential-center?resource=issue`) | Add richer validation UX | Backend + Frontend |
| Batch CSV issuance | Implemented (`bulk-issue`) | Robust CSV parser and downloadable error report | Backend |
| API/webhook issuance | Implemented (`webhook-issue`) | Event retries + idempotency keys | Integrations |
| Public verification page | Implemented (`credential-public?resource=verify`) | Branding/theme customization by template | Frontend |
| One-click social sharing | Implemented on public credential view | Add WhatsApp and mobile wallet passes | Frontend |
| Learner profile/wallet | Implemented (`learner-profile` endpoint + public view) | Profile editing UI for staff | Frontend |
| Pathways | Implemented schema + pathway create API | Pathway progress automation from completions | Backend |
| Spotlight directory | Implemented schema + public endpoint | Staff moderation UI | Frontend |
| Analytics funnel | Implemented (`mv_credential_funnel` + dashboard summary) | Multi-chart breakdown and export | Data |
| Tamper evidence | Implemented (verification logs + immutable events) | Optional blockchain notarization | Platform |
| MFA/SSO readiness | Planned and documented | Full auth provider integration | Security |
