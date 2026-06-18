/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'pulse-ring': 'pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)' },
          '50%': { boxShadow: '0 0 0 20px rgba(239, 68, 68, 0)' },
        }
      },
      colors: {
        'emergency-red': '#f43f5e', // Modern Rose/Coral Red
        'warning-amber': '#f97316', // Neon Orange/Amber
        'command-navy': '#08080a',   // Obsidian Black
        'panel-slate': '#121215',    // Deep Charcoal
        'accent-cyan': '#8b5cf6',    // Electric Purple/Violet
      }
    },
  },
  plugins: [],
}
