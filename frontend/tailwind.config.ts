import type { Config } from 'tailwindcss'
import forms from '@tailwindcss/forms'
import typography from '@tailwindcss/typography'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './index.html'
  ],
  theme: {
    extend: {
      colors: {
        'primary-bg': 'var(--color-primary-bg)',
        'secondary-bg': 'var(--color-secondary-bg)',
        'primary': 'var(--color-primary)',
        'primary-start': 'var(--color-primary-start)',
        'primary-end': 'var(--color-primary-end)',
        'highlight-1': 'var(--color-highlight-1)',
        'highlight-2': 'var(--color-highlight-2)',
        'text-primary': 'var(--color-text-primary)',
        'success': 'var(--color-success)',
        'warning': 'var(--color-warning)',
        'error': 'var(--color-error)',
        'info': 'var(--color-info)',
      },
      backgroundImage: {
        'primary-gradient': 'var(--background-image-primary-gradient)',
        'hover-gradient': 'var(--background-image-hover-gradient)',
      },
      fontFamily: {
        sans: 'var(--font-family-sans)',
      },
      screens: {
        xs: 'var(--breakpoint-xs)',
      },
      animation: {
        'fade-in': 'var(--animate-fade-in)',
        'fade-out': 'var(--animate-fade-out)',
        'slide-up': 'var(--animate-slide-up)',
        'slide-down': 'var(--animate-slide-down)',
        'pulse-slow': 'var(--animate-pulse-slow)',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
      },
    },
  },
  plugins: [
    forms,
    typography,
  ],
}

export default config