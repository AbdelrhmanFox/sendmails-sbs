-- جدول مستخدمي الداشبورد (تشغيله مرة واحدة من Supabase → SQL Editor)
create table if not exists app_users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  password_hash text not null,
  role text not null check (role in ('admin','user')),
  created_at timestamptz default now()
);
