-- Database audit fixes: security lints + FK index coverage.

-- SECURITY DEFINER views bypass caller RLS. Keep the funnel view caller-scoped.
alter view if exists public.mv_credential_funnel set (security_invoker = true);

-- Keep analytics read models server-only; Netlify functions use the service role.
revoke select on public.mv_course_completion_summary from anon, authenticated, public;

-- Public buckets can serve public object URLs without broad object listing policies.
drop policy if exists "Public read classroom assignment files" on storage.objects;
drop policy if exists "Public read classroom material files" on storage.objects;
drop policy if exists "Public read classroom submissions" on storage.objects;
drop policy if exists "Public read course materials" on storage.objects;

-- Cover foreign keys flagged by Supabase's performance advisor.
create index if not exists idx_certificates_batch_id on public.certificates(batch_id);
create index if not exists idx_classroom_grades_trainee_id on public.classroom_grades(trainee_id);
create index if not exists idx_invoice_lines_enrollment_uuid on public.invoice_lines(enrollment_uuid);
create index if not exists idx_learner_course_progress_batch_id on public.learner_course_progress(batch_id);
create index if not exists idx_pathway_steps_course_id on public.pathway_steps(course_id);
create index if not exists idx_training_messages_participant_id on public.training_messages(participant_id);
create index if not exists idx_training_participants_group_id on public.training_participants(group_id);
create index if not exists idx_transcript_entries_batch_id on public.transcript_entries(batch_id);
create index if not exists idx_transcript_entries_certificate_id on public.transcript_entries(certificate_id);
create index if not exists idx_transcript_entries_course_id on public.transcript_entries(course_id);

-- Cover foreign keys introduced by the deployed phase 0/phase 2 migrations.
create index if not exists idx_assignment_rubrics_rubric_id on public.assignment_rubrics(rubric_id);
create index if not exists idx_batches_course_id_fk on public.batches(course_id);
create index if not exists idx_cohort_enrollments_trainee_id on public.cohort_enrollments(trainee_id);
create index if not exists idx_cohorts_program_id on public.cohorts(program_id);
create index if not exists idx_program_courses_course_id on public.program_courses(course_id);
create index if not exists idx_rubric_criteria_rubric_id on public.rubric_criteria(rubric_id);
create index if not exists idx_rubric_scores_criterion_id on public.rubric_scores(criterion_id);
create index if not exists idx_session_attendance_trainee_id on public.session_attendance(trainee_id);
