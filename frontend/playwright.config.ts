import { defineConfig, devices } from '@playwright/test'

// E2e luồng giáo viên (C1 nấc 2): backend thật trên Postgres Testcontainers + AI giả (E2eBackendApplication, cổng 18080)
// và frontend Vite (cổng 15173). Cổng riêng để không đụng backend/frontend đang chạy dev trên máy. Cần Docker.
const BACKEND_PORT = 18080
const FRONTEND_PORT = 15173
// Đường dẫn tương đối tường minh: cmd của Windows không tìm thấy `mvnw.cmd` trần khi Playwright đặt cwd.
const mvnw = process.platform === 'win32' ? '.\\mvnw.cmd' : './mvnw'

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  // Không retry: test chập chờn phải đỏ để sửa, không được che.
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `${mvnw} -q -B spring-boot:test-run -Dspring-boot.run.main-class=com.aigameplatform.backend.e2e.E2eBackendApplication`,
      cwd: '../backend',
      // 401 khi chưa đăng nhập nghĩa là app đã lên (Playwright coi 401 là sẵn sàng).
      url: `http://localhost:${BACKEND_PORT}/api/games`,
      timeout: 300_000,
      reuseExistingServer: !process.env.CI,
      // Trên CI in log backend để thấy nguyên nhân khi khởi động lỗi (Spring ghi log ra stdout).
      stdout: process.env.CI ? 'pipe' : 'ignore',
      stderr: 'pipe',
    },
    {
      command: `npm run dev -- --port ${FRONTEND_PORT} --strictPort`,
      url: `http://localhost:${FRONTEND_PORT}`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      // Biến môi trường có sẵn được Vite ưu tiên hơn .env.local của máy dev.
      env: {
        VITE_API_BASE_URL: `http://localhost:${BACKEND_PORT}/api`,
        VITE_USE_MOCK: 'media',
      },
    },
  ],
})
