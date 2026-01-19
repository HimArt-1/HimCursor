export const environment = {
    production: false,
    supabaseUrl: import.meta.env['VITE_SUPABASE_URL'] || 'https://pimodqiufnxqwgmewyse.supabase.co',
    supabaseKey: import.meta.env['VITE_SUPABASE_KEY'] || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpbW9kcWl1Zm54cXdnbWV3eXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0NzcyNjgsImV4cCI6MjA4NDA1MzI2OH0.wooxuTrbTBKCFHlAKLLTKbGlJgeTh_Zj-h1cl6b1_Ec',
    apiKey: import.meta.env['VITE_GEMINI_API_KEY'] || 'AIzaSyBIxbW23SUltiHlAYRj8mWldBDRX3mXc0U'
};
