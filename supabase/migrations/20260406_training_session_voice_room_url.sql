-- Optional external voice room URL (Meet, Jitsi, Zoom, etc.) per training session.
alter table public.training_sessions
  add column if not exists voice_room_url text;

comment on column public.training_sessions.voice_room_url is 'Optional HTTPS link to an external voice/video room for the session.';
