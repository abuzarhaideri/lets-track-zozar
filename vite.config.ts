import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/lets-track-zozar/',
  plugins: [react(), tailwindcss()],
  preview: {
    allowedHosts: true,
  },
  server: {
    allowedHosts: true,
  },
})
