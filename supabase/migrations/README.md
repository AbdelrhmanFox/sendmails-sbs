# Supabase Migrations Guide

This directory contains ordered SQL patches for existing databases.

## Policy

- Keep migration files immutable after they are merged.
- Execute missing migrations in filename order.
- Never delete historical migrations unless you have verified the DB migration ledger and obtained explicit approval.

## Apply Flow

### Fresh database

1. Run `supabase/schema.sql`.
2. Apply only migrations created after your schema snapshot date (if any).

### Existing database

1. Check which migrations are already reflected in your environment.
2. Apply only missing files from this directory in filename order.
3. Validate key features immediately after applying.

## Feature-to-Migration Index

| Migration file | Main purpose |
| --- | --- |
| `20260402_dashboard_evolution.sql` | Early dashboard data model evolution baseline patch. |
| `20260403_training_groups_count_1_to_12.sql` | Expands training session group count range. |
| `20260404_training_session_whiteboard_flag.sql` | Adds optional whiteboard flag on training sessions. |
| `20260405_sbs_id_sequences.sql` | Adds SBS-formatted sequence helpers/ID generation support. |
| `20260406_training_session_voice_room_url.sql` | Adds optional trainer voice room URL field. |
| `20260407_classroom_tables.sql` | Introduces initial classroom domain tables. |
| `20260408_classroom_public_links.sql` | Adds public classroom join/access link support. |
| `20260409_course_library.sql` | Introduces course library storage metadata tables. |
| `20260409_demo_support_whatsapp_setting.sql` | Adds `app_settings` key for demo support WhatsApp number. |
| `20260410_course_library_storage.sql` | Extends course library storage and policy wiring. |
| `20260411_classroom_assignment_submissions.sql` | Adds assignment submission tables/relations. |
| `20260412_trainer_course_access_and_assignment_files.sql` | Adds trainer course access mapping and assignment file metadata. |
| `20260413_classroom_material_files.sql` | Adds classroom material file metadata support. |
| `20260414_phase0_security_integrity.sql` | Security and integrity hardening constraints/policies. |
| `20260415_phase1_core_lms.sql` | Core LMS phase structures and supporting constraints. |
| `20260416_phase2_programs_rubrics_attendance.sql` | Adds programs/rubrics/attendance phase schema. |
| `20260417_phase4_analytics_integrations.sql` | Adds analytics and integrations phase schema. |
| `20260418_batch_material_chapters.sql` | Adds chapter-level batch material structure. |
| `20260419_upload_policy_parity.sql` | Aligns upload/storage policy parity across flows. |

## Safety Notes

- Do not reorder files once published.
- Do not squash migrations into `schema.sql` for existing environments unless you also maintain replay compatibility.
- If in doubt, stop and verify against the target environment before applying additional SQL.
