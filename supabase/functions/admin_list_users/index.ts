import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { adminClient, requireAdmin } from '../_shared/admin.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const adminCheck = await requireAdmin(req);
  if (adminCheck.error) {
    return new Response(JSON.stringify({ error: adminCheck.error }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authById = new Map<string, string>();
    authUsers?.users?.forEach((u) => {
      authById.set(u.id, u.email || '');
    });

    const { data: profiles, error: profileError } = await adminClient
      .from('profiles')
      .select('id,name,role,avatar_color,avatar_url,is_active,updated_at');

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const users = (profiles || []).map((p: any) => ({
      ...p,
      email: authById.get(p.id) || ''
    }));

    return new Response(JSON.stringify({ users }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
