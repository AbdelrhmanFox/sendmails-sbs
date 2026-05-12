-- Re-key Excel-imported trainees and enrollments from XLS-* prefixes to standard
-- SBS-TR-###### / SBS-EN-###### business IDs (same UUID rows; payments unchanged).
-- Also normalise cash-book placeholder course/batch and scrub obvious import markers.

-- ---------------------------------------------------------------------------
-- Cash book ledger: replace XLS-cashbook with stable SBS-style course/batch ids
-- ---------------------------------------------------------------------------
insert into public.courses (course_id, course_name, category, target_audience, delivery_type, status)
values (
  'SBS-CO-CASHBOOK',
  'Cash book income',
  'Administrative',
  'Internal',
  'Online',
  'Active'
)
on conflict (course_id) do update
set course_name = excluded.course_name,
    status = excluded.status;

insert into public.batches (batch_id, course_id, batch_name)
values ('SBS-BA-SBS-CO-CASHBOOK-01', 'SBS-CO-CASHBOOK', 'Cash book income')
on conflict (batch_id) do update
set course_id = excluded.course_id,
    batch_name = excluded.batch_name;

insert into public.batch_counters (course_id, last_nn)
values ('SBS-CO-CASHBOOK', 1)
on conflict (course_id) do update
set last_nn = greatest(public.batch_counters.last_nn, excluded.last_nn);

update public.enrollments
set batch_id = 'SBS-BA-SBS-CO-CASHBOOK-01'
where batch_id = 'XLS-cashbook';

delete from public.batches where batch_id = 'XLS-cashbook';
delete from public.courses where course_id = 'XLS-cashbook';

-- ---------------------------------------------------------------------------
-- Payments / expenses: remove obvious Excel-import markers (real row updates)
-- ---------------------------------------------------------------------------
update public.payments
set
  created_by = case when created_by = 'excel-import' then null else created_by end,
  notes = case
    when notes is not null and notes ilike '%imported from Excel%' then trim(replace(notes, 'imported from Excel', ''))
    else notes
  end
where created_by = 'excel-import'
   or (notes is not null and notes ilike '%imported from Excel%');

update public.finance_expenses
set created_by = 'import'
where created_by = 'excel-import';

-- ---------------------------------------------------------------------------
-- Trainee business ids: XLS-* -> next_trainee_id()
-- ---------------------------------------------------------------------------
do $$
declare
  tr record;
  nid text;
begin
  for tr in
    select id, trainee_id
    from public.trainees
    where trainee_id like 'XLS-%'
    order by trainee_id
  loop
    nid := public.next_trainee_id();
    -- enrollments.trainee_id references trainees(trainee_id) with ON UPDATE CASCADE
    update public.trainees set trainee_id = nid where id = tr.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Enrollment business ids: XLS% -> next_enrollment_id()
-- ---------------------------------------------------------------------------
do $$
declare
  er record;
  eid text;
begin
  for er in
    select id, enrollment_id
    from public.enrollments
    where enrollment_id like 'XLS%'
    order by enrollment_id
  loop
    eid := public.next_enrollment_id();
    update public.enrollments set enrollment_id = eid where id = er.id;
  end loop;
end $$;

-- Placeholder emails used during import
update public.trainees
set email = regexp_replace(email, '@excel-import\.sbs\.local$', '@pending-update.sbs.local')
where email ilike '%@excel-import.sbs.local';
