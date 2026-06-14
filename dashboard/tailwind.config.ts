import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
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
      },
    },
  },
  plugins: [],
}

export default config
