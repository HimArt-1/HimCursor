-- COMMUNICATION HUB SCHEMA
-- Channels, Members, Enhanced Messages, Read Receipts

-- 1. Chat Channels
create table if not exists public.chat_channels (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  type text not null default 'group' check (type in ('direct', 'group', 'project')),
  icon text default '💬',
  created_by uuid references public.profiles(id),
  is_default boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Channel Members
create table if not exists public.chat_channel_members (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references public.chat_channels(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text default 'member' check (role in ('admin', 'member')),
  joined_at timestamp with time zone default now(),
  unique(channel_id, user_id)
);

-- 3. Enhance chat_messages table
alter table public.chat_messages
  add column if not exists message_type text default 'text' check (message_type in ('text', 'file', 'image', 'system')),
  add column if not exists file_url text,
  add column if not exists file_name text,
  add column if not exists file_size bigint,
  add column if not exists reply_to_id uuid references public.chat_messages(id) on delete set null,
  add column if not exists is_pinned boolean default false,
  add column if not exists reactions jsonb default '{}';

-- 4. Read Receipts
create table if not exists public.chat_read_receipts (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references public.chat_channels(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  last_read_at timestamp with time zone default now(),
  unique(channel_id, user_id)
);

-- 5. Insert default global channel
insert into public.chat_channels (name, description, type, icon, is_default)
values ('مجتمع وشاي', 'القناة العامة للفريق', 'group', '☕', true)
on conflict do nothing;

-- Update existing messages to link to default channel
-- (They already have channel_id = 'global', we keep that for backwards compat)

-- ===== RLS POLICIES =====

-- Channels
alter table public.chat_channels enable row level security;

create policy "Channels viewable by authenticated"
  on public.chat_channels for select
  using (auth.role() = 'authenticated');

create policy "Channels insertable by authenticated"
  on public.chat_channels for insert
  with check (auth.role() = 'authenticated');

create policy "Channels updatable by creator"
  on public.chat_channels for update
  using (auth.uid() = created_by);

-- Channel Members
alter table public.chat_channel_members enable row level security;

create policy "Channel members viewable by authenticated"
  on public.chat_channel_members for select
  using (auth.role() = 'authenticated');

create policy "Channel members insertable by authenticated"
  on public.chat_channel_members for insert
  with check (auth.role() = 'authenticated');

create policy "Channel members deletable by self or channel admin"
  on public.chat_channel_members for delete
  using (auth.uid() = user_id);

-- Read Receipts
alter table public.chat_read_receipts enable row level security;

create policy "Read receipts viewable by authenticated"
  on public.chat_read_receipts for select
  using (auth.role() = 'authenticated');

create policy "Read receipts upsertable by owner"
  on public.chat_read_receipts for insert
  with check (auth.uid() = user_id);

create policy "Read receipts updatable by owner"
  on public.chat_read_receipts for update
  using (auth.uid() = user_id);

-- Allow delete on chat_messages for pinning/admin
create policy "Messages deletable by sender"
  on public.chat_messages for delete
  using (auth.uid() = sender_id);

-- Allow update for pinning / reactions
create policy "Messages updatable by authenticated"
  on public.chat_messages for update
  using (auth.role() = 'authenticated');

-- Indexes for performance
create index if not exists idx_chat_messages_channel_id on public.chat_messages(channel_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages(created_at);
create index if not exists idx_chat_channel_members_channel on public.chat_channel_members(channel_id);
create index if not exists idx_chat_channel_members_user on public.chat_channel_members(user_id);

-- Enable realtime for new tables
alter publication supabase_realtime add table public.chat_channels;
alter publication supabase_realtime add table public.chat_channel_members;
alter publication supabase_realtime add table public.chat_read_receipts;
