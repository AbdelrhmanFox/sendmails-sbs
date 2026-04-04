-- Public participant links for Trainer Classroom (read-only classwork + materials, no login).

create table if not exists public.classroom_public_links (
  batch_id text primary key references public.batches (batch_id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.classroom_public_links enable row level security;

drop policy if exists classroom_public_links_deny_all on public.classroom_public_links;
create policy classroom_public_links_deny_all on public.classroom_public_links for all using (false);
