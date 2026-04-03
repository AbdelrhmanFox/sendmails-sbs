-- Allow a single group per training session (trainer share link uses group 1).
alter table public.training_sessions drop constraint if exists training_sessions_groups_count_check;
alter table public.training_sessions
  add constraint training_sessions_groups_count_check check (groups_count between 1 and 12);
