-- Phase 4: analytics read model + integration events baseline

create materialized view if not exists public.mv_course_completion_summary as
select
  lcp.course_id,
  count(*)::bigint as learners_total,
  count(*) filter (where lcp.status = 'completed')::bigint as learners_completed,
  round(
    case when count(*) = 0 then 0
    else (count(*) filter (where lcp.status = 'completed')::numeric / count(*)::numeric) * 100
    end
  , 2) as completion_rate_pct
from public.learner_course_progress lcp
group by lcp.course_id;

create unique index if not exists idx_mv_course_completion_summary_course on public.mv_course_completion_summary(course_id);

create table if not exists public.integration_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  source text not null default 'external',
  payload jsonb not null,
  status text not null default 'received',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_integration_events_created on public.integration_events(created_at desc);
create index if not exists idx_integration_events_type on public.integration_events(event_type);

alter table public.integration_events enable row level security;
drop policy if exists integration_events_deny_all on public.integration_events;
create policy integration_events_deny_all on public.integration_events for all using (false);

