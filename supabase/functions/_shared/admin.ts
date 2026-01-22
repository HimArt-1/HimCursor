import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

// Helper to normalize role string
function normalizeRole(role: string | null | undefined): string {
  if (!role) return '';
  return role.toLowerCase().replace(/[^a-z_]/g, '_');
}

// Check if role is admin level or higher
function isAdminRole(role: string | null | undefined): boolean {
  const normalized = normalizeRole(role);
  // system_admin, admin, System Admin, etc.
  if (normalized.includes('system') && normalized.includes('admin')) return true;
  if (normalized === 'admin' || normalized === 'administrator') return true;
  return false;
}

export async function requireAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return { error: 'Missing Authorization header' };
  }

  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user) {
    return { error: error?.message || 'Invalid user' };
  }

  // Check 1: ADMIN_EMAILS environment variable
  const adminEmails = (Deno.env.get('ADMIN_EMAILS') || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const isEmailAllowed = adminEmails.length > 0 && data.user.email && adminEmails.includes(data.user.email);

  // Check 2: app_metadata role
  const isMetadataAdmin = isAdminRole(data.user.app_metadata?.role);

  // Check 3: Profile table role (most common case)
  let isProfileAdmin = false;
  try {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();
    
    isProfileAdmin = isAdminRole(profile?.role);
  } catch (e) {
    console.warn('Could not fetch profile role:', e);
  }

  // Allow if any admin check passes
  if (!isEmailAllowed && !isMetadataAdmin && !isProfileAdmin) {
    return { error: 'Forbidden: admin only' };
  }

  return { user: data.user };
}

// Specific check for System Admin only
export async function requireSystemAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return { error: 'Missing Authorization header' };
  }

  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user) {
    return { error: error?.message || 'Invalid user' };
  }

  // Check profile for system_admin role
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  const normalized = normalizeRole(profile?.role);
  const isSystemAdmin = normalized.includes('system') && normalized.includes('admin');

  if (!isSystemAdmin) {
    return { error: 'Forbidden: System Admin only' };
  }

  return { user: data.user };
}
