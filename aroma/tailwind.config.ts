import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        aroma: {
          bg:           '#F9F8F4',
          surface:      '#FFFFFF',
          border:       '#E7E4DF',
          'border-lt':  '#F0EFEB',
          text:         '#1C1917',
          muted:        '#7A7570',
          faint:        '#A09890',
          accent:       '#B8966E',
          'accent-lt':  '#F4EFE8',
          dark:         '#120F0C',
          card:         '#1C1917',
        },
        status: {
          'green-text': '#5A8A6A',
          'green-bg':   '#EBF4EE',
          'amber-text': '#9A6A20',
          'amber-bg':   '#FBF3E4',
          'red-text':   '#8A5050',
          'red-bg':     '#F5EDED',
          'blue-text':  '#5068A0',
          'blue-bg':    '#EAF0F8',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:    ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-up':  'fadeUp 0.28s ease forwards',
        'float-a':  'floatA 6s ease-in-out infinite',
        'float-b':  'floatB 8s ease-in-out infinite',
        'float-c':  'floatC 7s ease-in-out infinite',
        'shimmer':  'shimmer 4s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        floatA: {
          '0%,100%': { transform: 'translateY(0px) rotate(-2deg)' },
          '50%':     { transform: 'translateY(-18px) rotate(2deg)' },
        },
        floatB: {
          '0%,100%': { transform: 'translateY(0px) rotate(3deg)' },
          '50%':     { transform: 'translateY(-12px) rotate(-1deg)' },
        },
        floatC: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-22px)' },
        },
        shimmer: {
          '0%,100%': { opacity: '0.18' },
          '50%':     { opacity: '0.32' },
        },
      },
      screens: {
        xs: '480px',
      },
    },
  },
  plugins: [],
}

export default config
