/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build') {
    const apiBaseUrl = loadEnv(mode, process.cwd()).VITE_API_BASE_URL?.trim() ?? ''
    const sameOrigin = /^\/(?![/\\])/.test(apiBaseUrl)
    if (!sameOrigin && !(/^https?:\/\//i.test(apiBaseUrl) && URL.canParse(apiBaseUrl))) {
      throw new Error('Set VITE_API_BASE_URL to an HTTP(S) URL or a same-origin path such as /api before building.')
    }
  }
  return {
    plugins: [react(), tailwindcss()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test-setup.ts'],
      // Nhiều file test nạp trang lazy và renderer Canvas cùng lúc; để hết số nhân CPU của máy thì test chậm bất thường và chập chờn (đã đo: 6 luồng
      // chạy ổn định ba lần liên tiếp, chỉ chậm hơn khoảng 10 giây).
      maxWorkers: 6,
      // Test đầu tiên của mỗi file nạp trang (lazy) lần đầu nên chậm hơn hẳn khi máy bận; 5 giây mặc định gây chập chờn.
      testTimeout: 20_000,
      hookTimeout: 20_000,
      // scripts/*.test.mjs chạy bằng `node --test`, không phải Vitest.
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
    },
  }
})
