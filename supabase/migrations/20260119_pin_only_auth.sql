-- Add is_active column to profiles if not exists
alter table public.profiles add column if not exists is_active boolean default true;

-- updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply updated_at trigger to profiles
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Apply updated_at trigger to tasks
drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- Helper: current user profile id
create or replace function public.current_profile_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from public.profiles where id = auth.uid() limit 1
$$;

-- Create indexes for better performance
create index if not exists tasks_assignee_id_idx on public.tasks(assignee_id);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists chat_messages_sender_id_idx on public.chat_messages(sender_id);
create index if not exists chat_messages_channel_id_idx on public.chat_messages(channel_id);
