-- TEAM CHAT SCHEMA
create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id),  -- Links to proper user profile
  sender_name text, -- De-normalized for speed, or can join
  sender_avatar text, 
  content text not null,
  channel_id text default 'global',
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.chat_messages enable row level security;

-- Policies
create policy "Chat viewable by authenticated users"
  on public.chat_messages for select
  using ( auth.role() = 'authenticated' );

create policy "Authenticated users can insert chat messages"
  on public.chat_messages for insert
  with check ( auth.role() = 'authenticated' );
