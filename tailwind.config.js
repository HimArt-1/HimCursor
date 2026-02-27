/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{html,ts,tsx}",
        "./index.html"
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                wushai: {
                    // الألوان الأساسية
                    sand: '#E6D3B3',          // Sand Paper — الأساسي
                    cocoa: '#7A4E2D',         // Cocoa Brown — الثانوي
                    olive: '#6B705C',         // Desert Olive — Accent فاخر
                    lavender: '#C8B6E2',      // Lavender Mist — Accent هادئ
                    // الخلفيات
                    espresso: '#1C1612',      // Espresso Ink — خلفية التطبيق
                    'deep-cocoa': '#2B211B',  // Deep Cocoa — خلفية ثانوية
                    'sidebar-dark': '#17110E', // Sidebar Dark
                    // النصوص
                    cream: '#F7F3EE',         // Cream White — النص الرئيسي
                    taupe: '#B9A99A',         // Warm Taupe — النص الباهت
                    // الحالات
                    success: '#7A8B6F',       // Olive Glow
                    warning: '#D6A75E',       // Desert Gold
                    danger: '#A45A52',        // Clay Red
                    // Aliases
                    light: '#F7F3EE',
                    dark: '#1C1612',
                    surface: '#342A23',
                    border: 'rgba(230,211,179,0.08)'
                }
            },
            fontFamily: {
                sans: ['Cairo', 'Tajawal', 'sans-serif'],
                display: ['Cairo', 'sans-serif'],
                heritage: ['Amiri', 'serif'],
            },
            boxShadow: {
                'warm': '0 4px 20px rgba(28,22,18,0.4)',
                'warm-lg': '0 8px 40px rgba(28,22,18,0.5)',
                'sand-glow': '0 0 30px rgba(230,211,179,0.08)',
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
