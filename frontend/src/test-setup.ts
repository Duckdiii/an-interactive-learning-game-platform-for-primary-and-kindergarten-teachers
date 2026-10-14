import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'
import { vi } from 'vitest'

// Khi máy bận (nhiều file test chạy song song, lần nạp trang lazy đầu tiên) mặc định 1 giây của findBy/waitFor gây chập chờn; test đúng vẫn xong
// ngay, test sai chỉ chờ lâu hơn một chút trước khi báo lỗi.
configure({ asyncUtilTimeout: 5000 })

// Mặc định test gọi API thật (đã được giả lập bằng vi.mock ở từng test) và không chờ độ trễ giả lập. Test về chế độ mô phỏng
// tự bật lại bằng vi.stubEnv('VITE_USE_MOCK', ...) và trả về 'none' sau khi xong.
vi.stubEnv('VITE_USE_MOCK', 'none')
vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')

// jsdom không cài sẵn ResizeObserver — cần polyfill tối thiểu cho các component tự co giãn
// theo khung chứa (ví dụ games/common/ResponsiveStage.tsx).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
