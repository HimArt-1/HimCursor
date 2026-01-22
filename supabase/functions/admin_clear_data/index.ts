import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { adminClient, requireSystemAdmin } from '../_shared/admin.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Require System Admin only
  const adminCheck = await requireSystemAdmin(req);
  if (adminCheck.error) {
    return new Response(JSON.stringify({ error: adminCheck.error }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { include_users, confirmation } = await req.json();

    // Require confirmation code
    if (confirmation !== 'DELETE') {
      return new Response(JSON.stringify({ error: 'Invalid confirmation code. Type DELETE to confirm.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const deletedTables: string[] = [];
    const errors: string[] = [];

    // Data tables to clear (order matters due to foreign keys)
    const dataTables = [
      'document_comments',
      'document_links', 
      'document_versions',
      'documents',
      'chat_messages',
      'tasks',
      'transactions',
      'milestones',
      'objectives',
      'assets'
    ];

    // Clear data tables
    for (const table of dataTables) {
      const { error } = await adminClient.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        errors.push(`${table}: ${error.message}`);
      } else {
        deletedTables.push(table);
      }
    }

    // If include_users is true, delete all non-admin users
    if (include_users) {
      // Get current admin's ID to exclude
      const currentAdminId = adminCheck.user?.id;

      // Get all users except current admin
      const { data: usersToDelete } = await adminClient
        .from('profiles')
        .select('id')
        .neq('id', currentAdminId);

      if (usersToDelete && usersToDelete.length > 0) {
        let deletedUsers = 0;
        for (const user of usersToDelete) {
          const { error: authError } = await adminClient.auth.admin.deleteUser(user.id);
          if (!authError) {
            deletedUsers++;
          } else {
            errors.push(`User ${user.id}: ${authError.message}`);
          }
        }
        deletedTables.push(`users (${deletedUsers} deleted)`);
      }
    }

    // Log this critical action
    const logEntry = {
      action: include_users ? 'FULL_SYSTEM_WIPE' : 'DATA_CLEAR',
      performed_by: adminCheck.user?.email,
      tables_cleared: deletedTables,
      timestamp: new Date().toISOString(),
      errors: errors.length > 0 ? errors : null
    };

    console.log('DATA CLEAR ACTION:', JSON.stringify(logEntry));

    return new Response(JSON.stringify({
      success: true,
      message: include_users ? 'System wiped completely' : 'Data cleared successfully',
      cleared_tables: deletedTables,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Clear data error:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Unexpected error during data clearing' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
