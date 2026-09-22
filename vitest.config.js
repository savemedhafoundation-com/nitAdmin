import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    maxWorkers: 2,
    testTimeout: 10000,
    include: ['src/**/*.test.{ts,tsx,js,jsx}'],
  },
})
