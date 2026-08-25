/**
 * Tailwind v4 uses CSS-first configuration via @theme in src/index.css.
 * This file documents the design tokens and content paths for tooling.
 */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FAF6EF',
        sage: '#7C8F6E',
        gold: '#C9A15A',
        charcoal: '#2E2A24',
        zoya: '#C98B93',
        'zoya-light': '#D9A9A0',
        abuzar: '#4F6D5C',
        'abuzar-light': '#4A6670',
        done: '#8BA888',
        missed: '#C4A090',
      },
      fontFamily: {
        heading: ['Cormorant Garamond', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['Amiri', 'Aref Ruqaa', 'serif'],
      },
      borderRadius: {
        soft: '1rem',
        card: '1.5rem',
      },
    },
  },
};
