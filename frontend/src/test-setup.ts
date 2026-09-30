import '@testing-library/jest-dom/vitest'

// jsdom không cài sẵn ResizeObserver — cần polyfill tối thiểu cho các component tự co giãn
// theo khung chứa (ví dụ games/common/ResponsiveStage.tsx).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver
