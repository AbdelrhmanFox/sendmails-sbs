-- Per-session opt-out for the shared realtime whiteboard (trainer-controlled at session creation).
alter table public.training_sessions
  add column if not exists whiteboard_enabled boolean not null default true;

comment on column public.training_sessions.whiteboard_enabled is 'When false, participants do not see or use the group whiteboard.';
