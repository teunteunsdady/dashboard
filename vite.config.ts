import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite 개발 서버 및 빌드 설정
export default defineConfig({
  plugins: [react()],
})
