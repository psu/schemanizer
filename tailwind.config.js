/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./client/index.html', './client/src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [require('@tailwindcss/typography')],
}
