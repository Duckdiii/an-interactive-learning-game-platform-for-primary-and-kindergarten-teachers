/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // Test đầu tiên của mỗi file nạp trang (lazy) lần đầu nên chậm hơn hẳn khi máy bận; 5 giây mặc định gây chập chờn.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
})
