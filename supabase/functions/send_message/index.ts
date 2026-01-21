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

  try {
    const { content } = await req.json();
    if (!content || !content.trim()) {
      return new Response(JSON.stringify({ error: 'Message content required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payload = {
      sender_id: profile.id,
      sender_name: profile.name,
      sender_avatar: null,
      content: content.trim(),
      channel_id: 'global',
      profile_id: profile.id
    };

    const { data, error: insertError } = await adminClient
      .from('chat_messages')
      .insert([payload])
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ message: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
