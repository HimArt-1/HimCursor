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
    const { id, updates } = await req.json();
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing task id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payload: Record<string, any> = {};
    if (updates?.title !== undefined) payload.title = updates.title;
    if (updates?.description !== undefined) payload.description = updates.description;
    if (updates?.domain) payload.domain = updates.domain;
    if (updates?.owner) payload.owner = updates.owner;
    if (updates?.priority) payload.priority = updates.priority;
    if (updates?.status) payload.status = updates.status;
    if (updates?.dueDate) payload.due_date = updates.dueDate;
    if (updates?.tags) payload.tags = updates.tags;

    const { error: updateError } = await adminClient
      .from('tasks')
      .update(payload)
      .eq('id', id)
      .eq('profile_id', profile.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
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
