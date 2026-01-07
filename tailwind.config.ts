import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'hsl(var(--color-primary, #3B82F6))',
        secondary: 'hsl(var(--color-secondary, #1E40AF))',
        'tenant-bg': 'hsl(var(--color-background, #F9FAFB))',
        'tenant-text': 'hsl(var(--color-text, #1F2937))',
      }
    },
  },
  plugins: [],
}
export default config
