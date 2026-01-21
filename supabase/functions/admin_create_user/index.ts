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
    const { email, password, name, role, avatar_color } = await req.json();
    if (!email || !password || !name) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role, avatarColor: avatar_color }
    });

    if (error || !data.user) {
      return new Response(JSON.stringify({ error: error?.message || 'Create user failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert([{
        id: data.user.id,
        name,
        role: role || 'Member',
        email,
        avatar_color: avatar_color || '#4B5842',
        is_active: true
      }]);

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ id: data.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
