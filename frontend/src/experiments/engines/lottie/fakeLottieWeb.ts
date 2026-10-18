/**
 * Bản GIẢ của `lottie-web` cho test (jsdom không vẽ được SVG/canvas động): chỉ phần API mà `LottieWebPlayer` dùng.
 * Dùng bằng `vi.mock('lottie-web', () => import('./fakeLottieWeb'))`.
 */
import { vi } from 'vitest'

type Listener = (event?: unknown) => void

export class FakeAnimation {
  config: Record<string, unknown>
  destroyed = false
  goToAndPlay = vi.fn()
  goToAndStop = vi.fn()
  private listeners = new Map<string, Set<Listener>>()

  constructor(config: Record<string, unknown>) {
    this.config = config
    // Giống lottie-web thật: dựng một nút con trong vùng chứa.
    const container = config.container as HTMLElement
    container.appendChild(document.createElement(config.renderer === 'canvas' ? 'canvas' : 'svg'))
  }
  addEventListener(name: string, listener: Listener) {
    const set = this.listeners.get(name) ?? new Set()
    set.add(listener)
    this.listeners.set(name, set)
  }
  /** Test: phát một sự kiện của hoạt ảnh. */
  emit(name: string, event?: unknown) {
    this.listeners.get(name)?.forEach((listener) => listener(event))
  }
  destroy() {
    this.destroyed = true
    ;(this.config.container as HTMLElement).replaceChildren()
  }
}

export const created: FakeAnimation[] = []
export const resetLottieWeb = () => {
  created.length = 0
}

const lottie = {
  loadAnimation: vi.fn((config: Record<string, unknown>) => {
    const animation = new FakeAnimation(config)
    created.push(animation)
    return animation
  }),
}
export default lottie
