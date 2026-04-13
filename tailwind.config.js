/** @type {import('tailwindcss').Config} */
// Design tokens from design.md v1. Do not inline hex values elsewhere —
// reference them via these semantic names.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    // Replace Tailwind defaults entirely where we want a closed set.
    colors: {
      transparent: 'transparent',
      current: 'currentColor',

      // §2 Base palette
      surface: '#14110F',
      'surface-elevated': '#1E1A18',
      'surface-sunken': '#0E0C0B',
      'border-subtle': '#2A2522',
      'border-strong': '#3B3330',
      text: '#F2EDE9',
      'text-muted': '#A39891',
      'text-faint': '#6B625D',

      // §2 Accent
      accent: '#E87566',
      'accent-strong': '#D65A4A',
      'accent-soft': '#F2A093',
      'accent-dim': '#5A2E28',
      // accent at 8% alpha — used for the circle-idle halo.
      'accent-ghost': 'rgba(232, 117, 102, 0.08)',

      // §7.1 circle-error fill
      'circle-error-fill': '#4A3330',
    },

    // §4 Spacing scale — token names preserved per design.md.
    // Tailwind class form: `p-space-3`, `gap-space-4`, etc.
    spacing: {
      0: '0',
      px: '1px',
      'space-1': '0.25rem',
      'space-2': '0.5rem',
      'space-3': '1rem',
      'space-4': '1.5rem',
      'space-5': '2.5rem',
      'space-6': '4rem',
    },

    // §5 Radii
    borderRadius: {
      none: '0',
      sm: '0.375rem', // radius-sm
      md: '0.75rem', // radius-md
      lg: '1.25rem', // radius-lg
      full: '9999px', // radius-full
    },

    // §5 Shadows
    boxShadow: {
      none: 'none',
      soft: '0 1px 2px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.2)',
      glow: '0 0 64px 8px rgba(232,117,102,0.18)',
    },

    // §3 Typography — one family, two weights (400, 500).
    fontFamily: {
      sans: [
        'Inter',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'system-ui',
        'sans-serif',
      ],
    },
    fontWeight: {
      normal: '400',
      medium: '500',
    },

    // §3 Type scale: [size, { lineHeight, letterSpacing?, fontWeight? }]
    fontSize: {
      display: ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
      hero: ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
      body: ['1rem', { lineHeight: '1.5' }],
      label: ['0.875rem', { lineHeight: '1.4' }],
      caption: ['0.75rem', { lineHeight: '1.4' }],
    },

    extend: {
      // §6 Motion tokens
      transitionTimingFunction: {
        calm: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      transitionDuration: {
        instant: '80ms',
        short: '200ms',
        medium: '450ms',
        long: '900ms',
        breath: '3200ms',
      },
      keyframes: {
        // §6 Idle breathing — 1.0 ↔ 1.025 over duration-breath, ease-calm.
        // We use a symmetric keyframe (0/100% same) so `animation-iteration-count: infinite`
        // produces a natural oscillation.
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.025)' },
        },
        breatheHalo: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
        },
        // §6 Triggered arc — 1.65s total across three phases. Percentages
        // are the fraction of total duration:
        //   0%   → 27%   warm-up swell (0ms → 450ms): scale 1 → 1.06
        //   27%  → 45%   hold (450ms → 750ms): scale 1.06
        //   45%  → 100%  release (750ms → 1650ms): scale 1.06 → 1
        // The fill color is driven by a CSS variable swap on the parent;
        // this keyframe owns scale only, so reduced-motion can drop it
        // without losing the color transition.
        triggerArc: {
          '0%': { transform: 'scale(1)' },
          '27%': { transform: 'scale(1.06)' },
          '45%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)' },
        },
        // Halo follows the same three-phase shape but amplifies slightly
        // more — it's the soft visual cue, not the anchor.
        triggerArcHalo: {
          '0%': { transform: 'scale(1)', opacity: '0' },
          '27%': { transform: 'scale(1.1)', opacity: '1' },
          '45%': { transform: 'scale(1.1)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '0' },
        },
      },
      animation: {
        // The JS component is the source of truth for reduced-motion behaviour;
        // these utilities just expose the keyframes.
        breathe: 'breathe 3200ms cubic-bezier(0.22, 0.61, 0.36, 1) infinite',
        'breathe-halo':
          'breatheHalo 3200ms cubic-bezier(0.22, 0.61, 0.36, 1) infinite',
        // §6 triggered arc: 1.65s, ease-calm, single play. Runs only while
        // the hero circle is in the triggered state; the parent times a
        // state flip back to idle once the arc completes.
        'trigger-arc':
          'triggerArc 1650ms cubic-bezier(0.22, 0.61, 0.36, 1) 1 forwards',
        'trigger-arc-halo':
          'triggerArcHalo 1650ms cubic-bezier(0.22, 0.61, 0.36, 1) 1 forwards',
      },
      // §9 Focus ring: 2px solid accent-soft, 2px offset.
      ringColor: {
        DEFAULT: '#F2A093',
      },
      outlineColor: {
        DEFAULT: '#F2A093',
      },
    },
  },
  plugins: [],
};
