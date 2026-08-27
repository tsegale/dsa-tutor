import type { Config } from 'tailwindcss'

// NOTE: This project runs Tailwind v4 via `@tailwindcss/vite`, which is
// CSS-first: it reads theme tokens from the `@theme` block in
// `src/index.css`, not from this file. The tokens below are mirrored
// into that `@theme` block (and into the shadcn CSS variables it's
// built from) so the design system actually renders. This file is
// kept as the literal, documented source of truth and for editor
// tooling (Tailwind IntelliSense) that reads `tailwind.config.ts`
// directly; it is not loaded by the build.
//
// EXCEPTION: the `spacing` scale below (xs/sm/md/lg/xl/2xl/3xl) is NOT
// mirrored into `@theme`. Tailwind v4 shares one --spacing-* scale
// across padding/margin/gap AND max-w-*/w-*/h-*/inset-* etc. Those
// names are Tailwind's own reserved default scale keys, so defining
// them would silently overwrite unrelated built-in utilities app-wide
// (verified: it broke max-w-3xl). The same pixel values already exist
// collision-free via the default numeric scale: xs=p-1, sm=p-2,
// md=p-4, lg=p-6, xl=p-8, 2xl=p-12, 3xl=p-16.
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#FFFFFF',
        surface: '#F8FAFC',
        border: '#E2E8F0',
        primary: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA',
          light: '#EEF2FF',
        },
        secondary: {
          DEFAULT: '#F59E0B',
          hover: '#D97706',
          light: '#FFFBEB',
        },
        success: {
          DEFAULT: '#16A34A',
          light: '#F0FDF4',
        },
        error: {
          DEFAULT: '#DC2626',
          light: '#FEF2F2',
        },
        active: '#7C3AED',
        streak: '#EA580C',
        muted: '#94A3B8',
        text: {
          primary: '#0F172A',
          secondary: '#475569',
          muted: '#94A3B8',
        },
        dark: {
          background: '#0F172A',
          surface: '#1E293B',
          border: '#334155',
          primary: '#6366F1',
          secondary: '#FBBF24',
          text: {
            primary: '#F8FAFC',
            secondary: '#CBD5E1',
          },
        },
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        full: '9999px',
      },
    },
  },
} satisfies Config
