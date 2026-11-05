import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    // Media is served from /public with its own cache strategy; keep JS chunks lean.
    assetsInlineLimit: 0,
  },
})
