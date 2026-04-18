-- ============================================
-- إضافة دعم التتابع (Relay Workflow) للطلبات
-- ============================================

-- إضافة الأعمدة اللازمة لجدول shared_requests
alter table public.shared_requests 
add column if not exists is_relay boolean default false,
add column if not exists relay_steps jsonb default '[]'::jsonb,
add column if not exists current_step_index int default 0;

-- إضافة تعليقات للأعمدة
comment on column public.shared_requests.is_relay is 'تحديد ما إذا كان الطلب يتبع نظام التتابع';
comment on column public.shared_requests.relay_steps is 'قائمة مراحل التتابع: [{label, role, assignee_id, status, notes}]';
comment on column public.shared_requests.current_step_index is 'مؤشر المرحلة النشطة حالياً';
