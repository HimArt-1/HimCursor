-- ============================================
-- الطلبات المشتركة (Shared Requests)
-- ============================================

-- 1. Main Requests Table
create table if not exists public.shared_requests (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  type text check (type in ('تصميم', 'برمجة', 'محتوى', 'تسويق', 'إداري', 'أخرى')) default 'أخرى',
  status text check (status in ('جديد', 'قيد التنفيذ', 'مكتمل')) default 'جديد',
  notes text,
  requester_id uuid references auth.users(id) not null,
  requester_name text,
  assignee_id uuid references auth.users(id),
  assignee_name text,
  completed_at timestamp with time zone,
  output_notes text,
  output_link text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.shared_requests enable row level security;

create policy "Shared requests viewable by authenticated users"
  on public.shared_requests for select
  using ( auth.role() = 'authenticated' );

create policy "Authenticated users can create requests"
  on public.shared_requests for insert
  with check ( auth.role() = 'authenticated' );

create policy "Authenticated users can update requests"
  on public.shared_requests for update
  using ( auth.role() = 'authenticated' );

create policy "Authenticated users can delete own requests"
  on public.shared_requests for delete
  using ( auth.uid() = requester_id );


-- 2. Attachments Table
create table if not exists public.shared_request_attachments (
  id uuid default gen_random_uuid() primary key,
  request_id uuid references public.shared_requests(id) on delete cascade not null,
  file_name text not null,
  file_url text not null,
  file_type text, -- MIME type
  file_size bigint default 0,
  kind text check (kind in ('input', 'output')) default 'input',
  uploaded_by uuid references auth.users(id),
  created_at timestamp with time zone default now()
);

alter table public.shared_request_attachments enable row level security;

create policy "Attachments viewable by authenticated users"
  on public.shared_request_attachments for select
  using ( auth.role() = 'authenticated' );

create policy "Authenticated users can add attachments"
  on public.shared_request_attachments for insert
  with check ( auth.role() = 'authenticated' );

create policy "Authenticated users can delete attachments"
  on public.shared_request_attachments for delete
  using ( auth.role() = 'authenticated' );


-- 3. Storage Bucket for file uploads
insert into storage.buckets (id, name, public)
values ('shared-requests', 'shared-requests', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Anyone can upload to shared-requests"
  on storage.objects for insert
  with check ( bucket_id = 'shared-requests' and auth.role() = 'authenticated' );

create policy "Anyone can view shared-requests files"
  on storage.objects for select
  using ( bucket_id = 'shared-requests' );

create policy "Anyone can delete own shared-requests files"
  on storage.objects for delete
  using ( bucket_id = 'shared-requests' and auth.role() = 'authenticated' );
