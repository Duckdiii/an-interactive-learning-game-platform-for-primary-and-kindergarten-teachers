/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type PluginOption } from 'vite'

const plugins: PluginOption[] = [react(), tailwindcss()]

// Sơ đồ bundle chỉ khi `ANALYZE=1` (T5.2): không ảnh hưởng build thường và test.
if (process.env.ANALYZE === '1') {
  const { visualizer } = await import('rollup-plugin-visualizer')
  plugins.push(visualizer({ filename: process.env.ANALYZE_OUT ?? 'dist/stats.html', template: 'treemap', gzipSize: true }))
}

// https://vite.dev/config/
export default defineConfig({
  plugins,
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
