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
    const { profile_id, name, role } = await req.json();
    if (!profile_id) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const updates: Record<string, any> = {};
    if (name) updates.name = name;
    if (role) updates.role = role;

    const { error } = await adminClient
      .from('profiles')
      .update(updates)
      .eq('id', profile_id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
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
