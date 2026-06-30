import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        zero: {
          black: '#050505',
          charcoal: '#111111',
          red: '#ed1c24',
          ember: '#ff3b30',
          cream: '#fff7ea'
        }
      },
      boxShadow: {
        glow: '0 22px 70px rgba(237, 28, 36, 0.32)',
        card3d: '0 24px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.08)'
      },
      fontFamily: {
        display: ['var(--font-display)', 'Impact', 'Arial Black', 'sans-serif'],
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;
