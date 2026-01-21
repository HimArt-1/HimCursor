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
    const { task } = await req.json();
    if (!task?.title) {
      return new Response(JSON.stringify({ error: 'Missing task.title' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payload = {
      title: task.title,
      description: task.description || '',
      domain: task.domain || 'Development',
      owner: profile.name,
      priority: task.priority || 'Medium',
      status: task.status || 'Todo',
      due_date: task.dueDate || new Date().toISOString(),
      tags: task.tags || [],
      profile_id: profile.id
    };

    const { data, error: insertError } = await adminClient
      .from('tasks')
      .insert([payload])
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ task: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Unexpected error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
