import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Explicitly bind to IPv4 and use a high, likely-open port
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 3001,
    strictPort: true,
  },
})