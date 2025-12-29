import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks
          'vendor-react': ['react', 'react-dom', 'framer-motion'],
          'vendor-three': ['three', '@react-three/fiber', '@react-three/drei', '@react-three/cannon'],
          'vendor-audio': ['howler'],
          'vendor-state': ['zustand'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
