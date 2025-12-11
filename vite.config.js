import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Allow all hosts for tunneling (demo purposes)
    allowedHosts: 'all',
    // Force full reload on HMR issues
    hmr: {
      overlay: true
    },
    // Prevent caching issues
    headers: {
      'Cache-Control': 'no-store'
    }
  },
  // Optimize deps to prevent stale cache
  optimizeDeps: {
    force: false // Set to true temporarily if you have cache issues
  }
})