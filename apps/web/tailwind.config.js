/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#0d9488',
          'teal-dark': '#0f766e',
          'teal-light': '#14b8a6',
          navy: '#0f172a',
        },
      },
    },
  },
  plugins: [],
};

