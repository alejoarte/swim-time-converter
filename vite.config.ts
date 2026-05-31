/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/swim-time-converter/',
  server: {
    allowedHosts: ['.ngrok-free.app'],
  },
  test: {
    globals: true,
    environment: 'node',
  },
})
