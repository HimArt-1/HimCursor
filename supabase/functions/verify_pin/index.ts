import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { compare } from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
import { adminClient } from '../_shared/admin.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { pin } = await req.json();
    if (!/^\d{6}$/.test(pin)) {
      return new Response(JSON.stringify({ error: 'PIN must be 6 digits' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: authData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: authError?.message || 'Invalid user' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const pinLast4 = pin.slice(-4);
    const { data: profiles, error } = await adminClient
      .from('profiles')
      .select('id,name,role,is_active,pin_hash,pin_last4')
      .eq('is_active', true)
      .eq('pin_last4', pinLast4)
      .limit(25);

    if (error || !profiles) {
      return new Response(JSON.stringify({ error: error?.message || 'Profile lookup failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let matched = null;
    for (const profile of profiles) {
      const ok = await compare(pin, profile.pin_hash);
      if (ok) {
        matched = profile;
        break;
      }
    }

    if (!matched) {
      return new Response(JSON.stringify({ error: 'Invalid PIN' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await adminClient.from('profile_sessions').upsert({
      auth_user_id: authData.user.id,
      profile_id: matched.id
    }, { onConflict: 'auth_user_id' });

    return new Response(JSON.stringify({
      profile: {
        id: matched.id,
        name: matched.name,
        role: matched.role,
        is_active: matched.is_active
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
