-- [20260418] EMERGENCY PRODUCTION FIX

-- 1. Create ROLES Table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    permissions JSONB DEFAULT '[]'::jsonb,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Insert Default Roles
INSERT INTO public.roles (name, description, is_system, permissions)
VALUES 
    ('admin', 'مدير النظام - صلاحيات كاملة', true, '["admin.full", "dashboard.view", "inventory.manage", "finance.manage"]'),
    ('supervisor', 'مشرف - إدارة العمليات والمخزون', true, '["dashboard.view", "inventory.manage", "tasks.manage"]'),
    ('user', 'موظف - عرض المهام والمخزون', true, '["dashboard.view", "inventory.view", "tasks.view"]')
ON CONFLICT (name) DO UPDATE SET permissions = EXCLUDED.permissions;

-- 3. Create NOTIFICATIONS Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create AUDIT_LOG Table
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. CRITICAL: Clean up PROFILES table (Trim role names)
-- This fixes the "admin\n" bug found in the logs
UPDATE public.profiles 
SET role = TRIM(BOTH FROM role);

-- 6. Enable RLS and add basic policies
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated" ON public.roles;
CREATE POLICY "Enable read for authenticated" ON public.roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 7. Force PostgREST schema reload
-- This helps resolve 400 Bad Request errors on recently added columns
NOTIFY pgrst, 'reload schema';

COMMENT ON TABLE public.roles IS 'System and custom roles for RBAC';
COMMENT ON TABLE public.notifications IS 'User system notifications';
COMMENT ON TABLE public.audit_log IS 'System activity and change logs';
