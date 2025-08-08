/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui'] },
      boxShadow: { glow: "0 10px 30px rgba(2,132,199,0.25)" },
      backgroundImage: { 'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))' }
    }
  },
  plugins: []
}
