/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        dash: {
          bg:          'oklch(97.2% 0.009 255)',
          surface:     'oklch(99.5% 0.003 240)',
          border:      'oklch(92% 0.012 250)',
          'border-lt': 'oklch(95% 0.007 250)',
          text:        'oklch(18% 0.008 240)',
          muted:       'oklch(64% 0.04 250)',
          faint:       'oklch(74% 0.025 250)',
          primary:     'oklch(67% 0.063 195)',
          'primary-lt':'oklch(94% 0.02 195)',
          'primary-dk':'oklch(59% 0.063 195)',
          secondary:   'oklch(42% 0.072 235)',
          'secondary-lt': 'oklch(94% 0.02 235)',
          'secondary-dk': 'oklch(35% 0.072 235)',
          success:     'oklch(72% 0.18 145)',
          'success-lt':'oklch(95% 0.04 145)',
          danger:      'oklch(57% 0.22 25)',
          'danger-lt': 'oklch(95.5% 0.04 25)',
          orange:      'oklch(72% 0.16 55)',
          'orange-lt': 'oklch(95% 0.04 55)',
          purple:      'oklch(52% 0.14 300)',
          'purple-lt': 'oklch(94% 0.03 300)',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        'card': '16px',
        'btn':  '10px',
        'tag':  '8px',
      },
      boxShadow: {
        'card':       '0 1px 4px oklch(18% 0.008 240 / 0.06), 0 0 1px oklch(18% 0.008 240 / 0.04)',
        'card-hover': '0 4px 16px oklch(18% 0.008 240 / 0.1), 0 1px 4px oklch(18% 0.008 240 / 0.06)',
        'modal':      '0 8px 32px oklch(18% 0.008 240 / 0.12)',
        'dropdown':   '0 4px 16px oklch(18% 0.008 240 / 0.1)',
      },
      animation: {
        'fade-up':   'fadeUp 0.22s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in':   'fadeIn 0.18s ease forwards',
        'scale-in':  'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1) forwards',
        'count-up':  'countUp 0.6s cubic-bezier(0.16,1,0.3,1) forwards',
      },
      keyframes: {
        fadeUp:   { from: { opacity: '0', transform: 'translateY(8px)' },   to: { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:   { from: { opacity: '0' },                                  to: { opacity: '1' } },
        scaleIn:  { from: { opacity: '0', transform: 'scale(0.96)' },        to: { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}
