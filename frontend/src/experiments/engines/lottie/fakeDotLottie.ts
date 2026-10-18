/**
 * Bản GIẢ của `@lottiefiles/dotlottie-web` cho test (jsdom không chạy được WASM/canvas): chỉ phần API mà
 * `DotLottiePlayer` dùng. Dùng bằng `vi.mock('@lottiefiles/dotlottie-web', () => import('./fakeDotLottie'))`.
 */
import { vi } from 'vitest'

type Listener = (event?: unknown) => void

export const state = { wasmUrl: null as string | null, instances: [] as DotLottie[] }
// Không xóa wasmUrl: DotLottiePlayer đặt nó một lần khi nạp module, trước mọi test.
export const resetDotLottie = () => {
  state.instances = []
}

export class DotLottie {
  config: Record<string, unknown>
  destroyed = false
  play = vi.fn()
  stop = vi.fn()
  setFrame = vi.fn()
  private listeners = new Map<string, Set<Listener>>()

  static setWasmUrl(url: string) {
    state.wasmUrl = url
  }

  constructor(config: Record<string, unknown>) {
    this.config = config
    state.instances.push(this)
  }
  addEventListener(name: string, listener: Listener) {
    const set = this.listeners.get(name) ?? new Set()
    set.add(listener)
    this.listeners.set(name, set)
  }
  /** Test: phát một sự kiện (ví dụ 'load', 'frame', 'complete'). */
  emit(name: string, event?: unknown) {
    this.listeners.get(name)?.forEach((listener) => listener(event))
  }
  destroy() {
    this.destroyed = true
  }
}
