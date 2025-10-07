/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tjsp-blue': '#003366',
        'tjsp-red': 'rgb(154, 26, 31)',
        'tjsp-gold': '#D4AF37',
        'tjsp-light': '#F5F7FA',
        'tjsp-dark': '#1A202C',
      },
    },
  },
  plugins: [],
}