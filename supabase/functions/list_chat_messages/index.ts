import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { adminClient } from '../_shared/admin.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { getProfileForSession } from '../_shared/profile.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { profile, error } = await getProfileForSession(req);
  if (error) {
    return new Response(JSON.stringify({ error }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data, error: queryError } = await adminClient
    .from('chat_messages')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: true })
    .limit(50);

  if (queryError) {
    return new Response(JSON.stringify({ error: queryError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ messages: data || [] }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
