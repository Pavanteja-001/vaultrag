/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        base: { 900: '#09090B' },
        surface: { 800: '#18181B', 700: '#27272A' },
        neon: {
          blue: '#00D2FF',
          purple: '#3A7BD5',
          green: '#00FF87',
          yellow: '#FFB800',
          red: '#FF003C',
        },
      },
      backgroundImage: {
        'gradient-ai': 'linear-gradient(to right, #00D2FF, #3A7BD5)',
        'gradient-ai-vertical': 'linear-gradient(to bottom, #00D2FF, #3A7BD5)',
      },
      boxShadow: {
        'glow-ai': '0 0 20px rgba(0, 210, 255, 0.4)',
        'glow-danger': '0 0 20px rgba(255, 0, 60, 0.4)',
        'glow-success': '0 0 20px rgba(0, 255, 135, 0.4)',
        'glow-warning': '0 0 20px rgba(255, 184, 0, 0.4)',
        'glow-inner': 'inset 0 0 15px rgba(0, 210, 255, 0.2)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Roboto Mono', 'monospace'],
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 210, 255, 0.4), 0 0 20px rgba(0, 210, 255, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 210, 255, 0.8), 0 0 40px rgba(0, 210, 255, 0.4)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
