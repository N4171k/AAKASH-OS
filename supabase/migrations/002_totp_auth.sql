-- Adds the custom auth columns and session table used by the TOTP login flow.

create extension if not exists "uuid-ossp";

alter table public.profiles
  add column if not exists username text,
  add column if not exists phone text,
  add column if not exists selected_apps jsonb not null default '[]'::jsonb,
  add column if not exists phone_verified boolean not null default false,
  add column if not exists totp_enabled boolean not null default false,
  add column if not exists totp_secret_encrypted text,
  add column if not exists totp_last_used_step bigint,
  add column if not exists recovery_code_hashes jsonb not null default '[]'::jsonb,
  add column if not exists backup_codes_disclosed_at timestamptz,
  add column if not exists enrollment_status text not null default 'pending',
  add column if not exists session_version integer not null default 0,
  add column if not exists last_login_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_key'
  ) then
    alter table public.profiles add constraint profiles_username_key unique (username);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_phone_key'
  ) then
    alter table public.profiles add constraint profiles_phone_key unique (phone);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'auth_sessions'
  ) then
    create table public.auth_sessions (
      id uuid primary key default uuid_generate_v4(),
      user_id uuid not null references public.profiles(id) on delete cascade,
      session_token_hash text not null unique,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    );
  end if;
end
$$;

alter table public.auth_sessions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'auth_sessions'
      and policyname = 'auth_sessions_crud_own'
  ) then
    create policy "auth_sessions_crud_own" on public.auth_sessions
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end
$$;