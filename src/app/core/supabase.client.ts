import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

const supabaseUrl = environment.supabaseUrl;
const supabaseAnonKey = environment.supabaseAnonKey;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

if (!isSupabaseConfigured) {
  console.error('[Supabase] Missing configuration: supabaseUrl or supabaseAnonKey');
}

export const supabaseClient: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
