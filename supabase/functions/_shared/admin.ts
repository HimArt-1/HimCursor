import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

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

  const adminEmails = (Deno.env.get('ADMIN_EMAILS') || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const isEmailAllowed = adminEmails.length > 0 && data.user.email && adminEmails.includes(data.user.email);
  const isRoleAdmin = data.user.app_metadata?.role === 'admin';

  if (!isEmailAllowed && !isRoleAdmin) {
    return { error: 'Forbidden: admin only' };
  }

  return { user: data.user };
}
