/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./resources/**/*.{js,ts,jsx,tsx}",
    "./resources/js/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
