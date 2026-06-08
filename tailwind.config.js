/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#06060b',
          800: '#0a0a14',
          700: '#10101e',
          600: '#16172a',
          500: '#1e2038',
        },
        cam: {
          DEFAULT: '#00E5FF',
          soft: '#7df9ff',
          deep: '#0091a8',
        },
        arthur: {
          DEFAULT: '#FF2BD6',
          soft: '#ff8ae9',
          deep: '#a8138c',
        },
        win: '#39FF14',
        warn: '#FFB800',
        gold: {
          DEFAULT: '#FFC53D',
          soft: '#ffe08a',
          deep: '#b8860b',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'system-ui', 'sans-serif'],
        body: ['"Chakra Petch"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-cam': '0 0 5px #00E5FF, 0 0 20px rgba(0,229,255,0.55), 0 0 40px rgba(0,229,255,0.25)',
        'neon-arthur': '0 0 5px #FF2BD6, 0 0 20px rgba(255,43,214,0.55), 0 0 40px rgba(255,43,214,0.25)',
        'neon-win': '0 0 5px #39FF14, 0 0 22px rgba(57,255,20,0.55)',
        'card': '0 0 0 1px rgba(255,255,255,0.06), 0 8px 30px rgba(0,0,0,0.5)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '0.85', filter: 'brightness(1.35)' },
        },
        'ticker': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'flash': {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(255,255,255,0.12)' },
        },
        'rise': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'crown-bob': {
          '0%, 100%': { transform: 'translateY(0) rotate(-4deg)' },
          '50%': { transform: 'translateY(-6px) rotate(4deg)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.2s ease-in-out infinite',
        'ticker': 'ticker 30s linear infinite',
        'flash': 'flash 0.7s ease-in-out 2',
        'rise': 'rise 0.35s ease-out',
        'crown-bob': 'crown-bob 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
