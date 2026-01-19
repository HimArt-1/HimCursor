-- Enable UUID extension (if not already enabled)
create extension if not exists "uuid-ossp";

-- DROP EVERYTHING FIRST (Reset Schema)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

drop table if exists public.assets cascade;
drop table if exists public.milestones cascade;
drop table if exists public.objectives cascade;
drop table if exists public.transactions cascade;
drop table if exists public.profiles cascade;

-- 1. Profiles Table (Extends Supabase Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text,
  role text default 'Member',
  email text, -- Added for easier login mapping
  avatar_url text,
  avatar_color text,
  pin text,
  updated_at timestamp with time zone default now()
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- 2. Finance: Transactions
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  type text check (type in ('Income', 'Expense')) not null,
  category text,
  amount numeric not null,
  description text,
  date timestamp with time zone default now(),
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

alter table public.transactions enable row level security;

create policy "Transactions are viewable by authenticated users"
  on public.transactions for select
  using ( auth.role() = 'authenticated' );

create policy "Authenticated users can insert transactions"
  on public.transactions for insert
  with check ( auth.role() = 'authenticated' );

-- 3. Objectives & OKRs
create table public.objectives (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  progress integer default 0,
  term text check (term in ('Short', 'Medium', 'Long')),
  owner_id uuid references public.profiles(id),
  created_at timestamp with time zone default now()
);

alter table public.objectives enable row level security;

create policy "Objectives viewable by everyone"
  on public.objectives for select
  using ( true );

create policy "Auth users can manage objectives"
  on public.objectives for all
  using ( auth.role() = 'authenticated' );

-- 3.1. Milestones (Timeline)
create table public.milestones (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  date timestamp with time zone not null,
  type text,
  created_at timestamp with time zone default now()
);

alter table public.milestones enable row level security;

create policy "Milestones viewable by everyone"
  on public.milestones for select
  using ( true );

create policy "Auth users can manage milestones"
  on public.milestones for all
  using ( auth.role() = 'authenticated' );

-- 4. Assets
create table public.assets (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text,
  url text,
  status text,
  project text,
  created_at timestamp with time zone default now()
);

alter table public.assets enable row level security;

create policy "Assets viewable by everyone"
  on public.assets for select
  using ( true );

create policy "Auth users can manage assets"
  on public.assets for all
  using ( auth.role() = 'authenticated' );

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, 
    name, 
    email, 
    role, 
    pin, 
    avatar_url, 
    avatar_color
  )
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'name', 'New Member'), 
    new.email, 
    coalesce(new.raw_user_meta_data->>'role', 'Member'),
    coalesce(new.raw_user_meta_data->>'pin', '0000'),
    new.raw_user_meta_data->>'avatarUrl',
    coalesce(new.raw_user_meta_data->>'avatarColor', '#2563eb')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
