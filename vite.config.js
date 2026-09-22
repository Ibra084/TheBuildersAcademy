import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  server: { proxy: { '/api': 'http://127.0.0.1:3001' } },
  plugins: [react(), tailwindcss()],
})
