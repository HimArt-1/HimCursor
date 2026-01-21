import { adminClient } from './admin.ts';

export async function getProfileForSession(req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return { error: 'Missing Authorization header' };

  const { data, error } = await adminClient.auth.getUser(token);
  if (error || !data.user) {
    return { error: error?.message || 'Invalid user' };
  }

  const { data: sessionRow, error: sessionError } = await adminClient
    .from('profile_sessions')
    .select('profile_id')
    .eq('auth_user_id', data.user.id)
    .single();

  if (sessionError || !sessionRow?.profile_id) {
    return { error: sessionError?.message || 'Profile session not found' };
  }

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('id,name,role,is_active')
    .eq('id', sessionRow.profile_id)
    .single();

  if (profileError || !profile) {
    return { error: profileError?.message || 'Profile not found' };
  }

  if (!profile.is_active) {
    return { error: 'Profile disabled' };
  }

  return { profile, authUserId: data.user.id };
}
