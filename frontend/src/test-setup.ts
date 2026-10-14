import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

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
