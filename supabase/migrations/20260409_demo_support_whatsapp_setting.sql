create table if not exists public.app_settings (
  key text primary key,
  value_text text null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'app_settings'
      and policyname = 'app_settings_deny_all'
  ) then
    create policy app_settings_deny_all
      on public.app_settings
      for all
      using (false);
  end if;
end $$;

insert into public.app_settings (key, value_text)
values ('demo_whatsapp_support_number', null)
on conflict (key) do nothing;
