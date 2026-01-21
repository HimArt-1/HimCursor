-- Add is_active to profiles for admin disable
alter table public.profiles add column if not exists is_active boolean default true;

-- Tighten profiles select policy to authenticated only
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  using ( auth.role() = 'authenticated' );
