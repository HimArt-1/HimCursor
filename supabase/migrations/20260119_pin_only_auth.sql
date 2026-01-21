-- Profiles table (PIN-only identity)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  name text,
  role text check (role in ('admin','supervisor','user')) default 'user',
  pin_hash text not null,
  pin_last4 text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Session to Profile mapping (auth.uid -> profile_id)
create table if not exists public.profile_sessions (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Helper: current profile id based on auth session
create or replace function public.current_profile_id()
returns uuid
language sql
security definer
set search_path = public
set row_security = off
as $$
  select profile_id
  from public.profile_sessions
  where auth_user_id = auth.uid()
  limit 1
$$;

-- Add profile_id to app tables
alter table public.tasks add column if not exists profile_id uuid references public.profiles(id);
alter table public.chat_messages add column if not exists profile_id uuid references public.profiles(id);

create index if not exists tasks_profile_id_idx on public.tasks(profile_id);
create index if not exists chat_messages_profile_id_idx on public.chat_messages(profile_id);

-- RLS: profiles & profile_sessions (no direct client access)
alter table public.profiles enable row level security;
alter table public.profile_sessions enable row level security;

-- RLS: tasks/chat_messages allow read by current profile, deny writes from client
alter table public.tasks enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own"
on public.tasks
for select
to anon, authenticated
using (profile_id = public.current_profile_id());

drop policy if exists "chat_select_own" on public.chat_messages;
create policy "chat_select_own"
on public.chat_messages
for select
to anon, authenticated
using (profile_id = public.current_profile_id());
