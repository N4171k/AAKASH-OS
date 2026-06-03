-- AAKASH OS initial schema
-- Apply this in the Supabase SQL editor or via Supabase CLI migrations.

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  username text unique not null,
  email text unique not null,
  phone text unique not null,
  full_name text,
  avatar_url text,
  selected_apps jsonb not null default '[]'::jsonb,
  phone_verified boolean not null default false,
  totp_enabled boolean not null default false,
  totp_secret_encrypted text,
  totp_last_used_step bigint,
  recovery_code_hashes jsonb not null default '[]'::jsonb,
  backup_codes_disclosed_at timestamptz,
  enrollment_status text not null default 'pending' check (enrollment_status in ('pending', 'phone_verified', 'totp_pending', 'active')),
  role text not null default 'user' check (role in ('user', 'student', 'admin')),
  plan_type text not null default 'free' check (plan_type in ('free', 'student', 'premium')),
  storage_used bigint not null default 0,
  storage_limit bigint not null default 104857600,
  session_version integer not null default 0,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.auth_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  file_type text not null default 'document',
  mime_type text,
  cloudinary_public_id text,
  cloudinary_url text,
  file_size bigint not null default 0,
  parent_id uuid references public.files(id) on delete cascade,
  is_folder boolean not null default false,
  path text,
  metadata jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Untitled',
  content text not null default '',
  pinned boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  language text not null,
  description text,
  is_public boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  last_run_output text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_files (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  content text,
  cloudinary_public_id text,
  is_main boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme text not null default 'dark' check (theme in ('light', 'dark', 'system')),
  wallpaper_url text,
  dock_position text not null default 'bottom' check (dock_position in ('bottom', 'left', 'right')),
  desktop_layout jsonb not null default '{}'::jsonb,
  window_preferences jsonb not null default '{}'::jsonb,
  notifications_enabled boolean not null default true,
  auto_save_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_layouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Default',
  layout_data jsonb not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  return new;
end;
$$;

alter table public.profiles enable row level security;
alter table public.auth_sessions enable row level security;
alter table public.files enable row level security;
alter table public.notes enable row level security;
alter table public.projects enable row level security;
alter table public.project_files enable row level security;
alter table public.user_preferences enable row level security;
alter table public.workspace_layouts enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "auth_sessions_crud_own" on public.auth_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "files_crud_own" on public.files
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notes_crud_own" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "projects_crud_own" on public.projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "project_files_crud_own" on public.project_files
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "user_preferences_crud_own" on public.user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "workspace_layouts_crud_own" on public.workspace_layouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
