// Safe environment variable access for production
const getEnvVar = (key: string): string => {
  try {
    return (import.meta.env && import.meta.env[key]) || '';
  } catch {
    return '';
  }
};

export const environment = {
  production: true,
  supabaseUrl: getEnvVar('VITE_SUPABASE_URL'),
  supabaseAnonKey: getEnvVar('VITE_SUPABASE_KEY'),
  apiKey: getEnvVar('VITE_GEMINI_API_KEY')
};
