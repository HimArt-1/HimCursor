-- RBAC + NOTIFICATIONS SCHEMA

-- ============ RBAC ============

-- 1. Permissions Reference Table
create table if not exists public.permissions (
  key text primary key,
  label text not null,
  category text not null
);

-- Insert default permissions
insert into public.permissions (key, label, category) values
  ('dashboard.view', 'عرض لوحة التحكم', 'عام'),
  ('tasks.view', 'عرض المهام', 'المهام'),
  ('tasks.manage', 'إدارة المهام', 'المهام'),
  ('requests.view', 'عرض الطلبات', 'الطلبات'),
  ('requests.manage', 'إدارة الطلبات', 'الطلبات'),
  ('inventory.view', 'عرض المخزون', 'المخزون'),
  ('inventory.manage', 'إدارة المخزون', 'المخزون'),
  ('finance.view', 'عرض المالية', 'المالية'),
  ('finance.manage', 'إدارة المالية', 'المالية'),
  ('members.view', 'عرض الأعضاء', 'الأعضاء'),
  ('members.manage', 'إدارة الأعضاء', 'الأعضاء'),
  ('content.view', 'عرض المحتوى', 'المحتوى'),
  ('content.manage', 'إدارة المحتوى', 'المحتوى'),
  ('strategy.view', 'عرض الاستراتيجية', 'الاستراتيجية'),
  ('strategy.manage', 'إدارة الاستراتيجية', 'الاستراتيجية'),
  ('settings.manage', 'إدارة الإعدادات', 'النظام'),
  ('support.manage', 'إدارة الدعم الفني', 'النظام'),
  ('audit.view', 'عرض سجل التدقيق', 'النظام'),
  ('admin.users', 'إدارة المستخدمين', 'النظام'),
  ('admin.roles', 'إدارة الأدوار', 'النظام'),
  ('admin.full', 'صلاحيات كاملة', 'النظام')
on conflict (key) do nothing;

-- 2. Roles Table
create table if not exists public.roles (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  permissions jsonb default '[]',
  is_system boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Insert default roles
insert into public.roles (name, description, permissions, is_system) values
  ('admin', 'مدير النظام — صلاحيات كاملة', '["admin.full"]', true),
  ('supervisor', 'مشرف — عمليات وتقارير', '["dashboard.view","tasks.view","tasks.manage","requests.view","requests.manage","inventory.view","inventory.manage","finance.view","members.view","content.view","content.manage","strategy.view","strategy.manage","audit.view"]', true),
  ('member', 'عضو — عرض وتنفيذ', '["dashboard.view","tasks.view","tasks.manage","requests.view","requests.manage","inventory.view","content.view","strategy.view"]', true),
  ('viewer', 'مشاهد — عرض فقط', '["dashboard.view","tasks.view","requests.view","inventory.view","content.view","strategy.view"]', true)
on conflict (name) do nothing;

-- 3. Add role_id to profiles
alter table public.profiles
  add column if not exists role_id uuid references public.roles(id);

-- Link existing profiles by role name
update public.profiles p
  set role_id = r.id
  from public.roles r
  where lower(p.role) = lower(r.name)
  and p.role_id is null;

-- RLS for roles
alter table public.roles enable row level security;
alter table public.permissions enable row level security;

create policy "Roles viewable by authenticated"
  on public.roles for select
  using (auth.role() = 'authenticated');

create policy "Roles manageable by admin"
  on public.roles for all
  using (auth.role() = 'authenticated');

create policy "Permissions viewable by authenticated"
  on public.permissions for select
  using (auth.role() = 'authenticated');

-- 4. Audit Log
create table if not exists public.audit_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  user_name text,
  action text not null,
  entity_type text,
  entity_id text,
  details text,
  ip_address text,
  created_at timestamp with time zone default now()
);

alter table public.audit_log enable row level security;

create policy "Audit viewable by authenticated"
  on public.audit_log for select
  using (auth.role() = 'authenticated');

create policy "Audit insertable by authenticated"
  on public.audit_log for insert
  with check (auth.role() = 'authenticated');

-- ============ NOTIFICATIONS ============

-- 5. Notifications Table (DB-backed)
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text default 'Info' check (type in ('Success', 'Info', 'Warning', 'celebrate')),
  category text default 'system',
  is_read boolean default false,
  action_url text,
  grouped_key text,
  created_at timestamp with time zone default now()
);

alter table public.notifications enable row level security;

-- Users can only see their own notifications
create policy "Users see own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Authenticated can insert notifications"
  on public.notifications for insert
  with check (auth.role() = 'authenticated');

create policy "Users update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Users delete own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_audit_log_user on public.audit_log(user_id);
create index if not exists idx_audit_log_created on public.audit_log(created_at desc);
create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_unread on public.notifications(user_id, is_read) where is_read = false;
create index if not exists idx_profiles_role_id on public.profiles(role_id);

-- Enable realtime
alter publication supabase_realtime add table public.audit_log;
alter publication supabase_realtime add table public.notifications;
