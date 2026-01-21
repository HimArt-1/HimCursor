export const environment = {
  production: false,
  supabaseUrl: import.meta.env['VITE_SUPABASE_URL'] || '',
  supabaseAnonKey: import.meta.env['VITE_SUPABASE_KEY'] || '',
  apiKey: import.meta.env['VITE_GEMINI_API_KEY'] || ''
};
