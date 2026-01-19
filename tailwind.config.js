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
                    forest: '#2F3E2E',   // غابة
                    clay: '#5A3E2B',     // طين
                    espresso: '#3E3230', // اسبريسو (Desaturated) - Background
                    'sidebar-dark': '#251E1D', // Sidebar Dark (40% darker than espresso)
                    surface: '#524441',  // سطح (Desaturated) - Cards
                    lilac: '#9D8BB1',    // ليلك - Sidebar Text
                    olive: '#4B5842',    // زيتوني - Primary
                    sand: '#EBE5D9',     // رمل - Light Mode Background
                    // Aliases
                    dark: '#2F3E2E',
                    brown: '#5A3E2B',
                    deep: '#3E3230',
                    lavender: '#9D8BB1',
                    light: '#F8F6F1',
                    black: '#2C241B',
                    danger: '#B91C1C',
                    success: '#15803D',
                    warning: '#B45309'
                }
            },
            fontFamily: {
                sans: ['Tajawal', 'sans-serif'],
            }
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}
