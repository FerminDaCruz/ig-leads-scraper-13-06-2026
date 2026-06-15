import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist)', ...fontFamily.sans],
      },
      colors: {
        navy: {
          DEFAULT: '#1f2a44',
          dark:   '#141c2e',
          card:   '#253452',
          border: '#2d3f5e',
        },
        cream: '#FFF4E4',
        surface: '#f4f4f4',
        brand: '#22d3ee',
        muted: '#6b7280',
      },
    },
  },
  plugins: [],
}

export default config
