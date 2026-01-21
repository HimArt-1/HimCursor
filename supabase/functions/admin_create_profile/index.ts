import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { hash } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
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
    const { name, role, pin } = await req.json();
    if (!name || !/^\d{6}$/.test(pin)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const pinHash = await hash(pin);
    const pinLast4 = pin.slice(-4);

    const { data, error } = await adminClient
      .from('profiles')
      .insert([{
        name,
        role: role || 'user',
        pin_hash: pinHash,
        pin_last4: pinLast4,
        is_active: true
      }])
      .select('id')
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
