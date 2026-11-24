import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('src/lib/portraitExample')) return 'portrait-example'
        },
      },
    },
  },
})
