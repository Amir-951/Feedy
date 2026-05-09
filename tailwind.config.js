/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        feedy: {
          oat: '#F6F4ED',
          forest: '#1B3C35',
          terracotta: '#D46A55',
          sage: '#8F9B82',
          sand: '#E8E4D9',
        }
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        serif: ['"Fraunces"', 'serif'],
      }
    },
  },
  plugins: [],
}
