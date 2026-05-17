/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        dash: {
          // Surfaces
          bg:          'oklch(95.5% 0.018 85)',    // --cream
          paper:       'oklch(98.2% 0.012 80)',    // --paper
          'paper-2':   'oklch(96.5% 0.016 80)',   // --paper-2
          // Borders
          border:      'oklch(89% 0.018 80)',      // --line
          'border-lt': 'oklch(92.5% 0.014 80)',   // --line-2
          // Text
          text:        'oklch(26% 0.04 250)',      // --ink
          'text-2':    'oklch(40% 0.04 245)',      // --ink-2
          muted:       'oklch(56% 0.035 240)',     // --muted
          faint:       'oklch(70% 0.025 235)',     // --faint
          // Teal (primary)
          primary:     'oklch(58% 0.075 205)',     // --teal
          'primary-dk':'oklch(46% 0.075 210)',     // --teal-dk
          'primary-lt':'oklch(94% 0.025 200)',     // --teal-lt
          // Sage (success)
          success:     'oklch(68% 0.045 140)',     // --sage
          'success-dk':'oklch(52% 0.045 145)',     // --sage-dk
          'success-lt':'oklch(94% 0.022 140)',     // --sage-lt
          // Fig (warning/amber)
          fig:         'oklch(75% 0.085 100)',     // --fig
          'fig-lt':    'oklch(94% 0.035 100)',     // --fig-lt
          // Rose (danger)
          danger:      'oklch(60% 0.13 25)',       // --rose
          'danger-lt': 'oklch(95% 0.025 25)',      // --rose-lt
        },
      },
      fontFamily: {
        sans:    ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Fraunces"', 'Georgia', 'serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        card: '16px',
        btn:  '10px',
        tag:  '8px',
      },
      boxShadow: {
        card:       '0 1px 4px oklch(26% 0.04 250 / 0.06), 0 0 1px oklch(26% 0.04 250 / 0.04)',
        'card-hover':'0 4px 16px oklch(26% 0.04 250 / 0.1), 0 1px 4px oklch(26% 0.04 250 / 0.06)',
        modal:      '0 8px 32px oklch(26% 0.04 250 / 0.12)',
        dropdown:   '0 4px 16px oklch(26% 0.04 250 / 0.1)',
      },
      animation: {
        'fade-up':  'fadeUp 0.22s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in':  'fadeIn 0.18s ease forwards',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1) forwards',
      },
      keyframes: {
        fadeUp:  { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}
