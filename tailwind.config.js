/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        main: {
          DEFAULT: '#0E62F7',
          dark: '#0B4FC4',
        },
        sub: {
          DEFAULT: '#38BDF8',
          light: '#7DD3FC',
        },
        surface: {
          DEFAULT: '#F8FAFC',
          card: '#FFFFFF',
        },
        text: {
          primary: '#0F172A',
          secondary: '#64748B',
        },
        border: '#E2E8F0',
      },
      fontFamily: {
        sans: ['Pretendard', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 24px -4px rgb(14 98 247 / 0.08)',
        'card-hover': '0 12px 32px -8px rgb(14 98 247 / 0.15)',
      },
    },
  },
  plugins: [],
}
