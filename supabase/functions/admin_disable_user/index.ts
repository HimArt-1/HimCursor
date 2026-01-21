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
    const { user_id, is_active } = await req.json();
    if (!user_id || typeof is_active !== 'boolean') {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { error: authError } = await adminClient.auth.admin.updateUserById(user_id, {
      ban_duration: is_active ? '0h' : '87600h'
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({ is_active })
      .eq('id', user_id);

    if (profileError) {
      return new Response(JSON.stringify({ error: profileError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
