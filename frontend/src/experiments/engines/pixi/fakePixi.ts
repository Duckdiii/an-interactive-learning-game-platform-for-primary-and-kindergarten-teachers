/**
 * Bản GIẢ của `pixi.js` cho test (jsdom không có WebGL): chỉ gồm phần API mà `PixiSceneView` và
 * `PixiNumberLineRenderer` dùng. Dùng bằng `vi.mock('pixi.js', () => import('./fakePixi'))`.
 */
import { vi } from 'vitest'

type Handler = (event: unknown) => void

/** Điều khiển từ test: giữ lại hoặc thả việc khởi tạo, và danh sách ứng dụng đã tạo. */
export const control = {
  holdInit: false,
  failInit: false,
  apps: [] as Application[],
  releaseInit: [] as Array<() => void>,
  reset() {
    this.holdInit = false
    this.failInit = false
    this.apps = []
    this.releaseInit = []
  },
}

class Display {
  children: Display[] = []
  parent: Display | null = null
  destroyed = false
  eventMode: string | undefined
  hitArea: unknown
  position = { x: 0, y: 0, set: (x: number, y: number) => void Object.assign(this.position, { x, y }) }
  anchor = { x: 0, y: 0, set: (v: number) => void Object.assign(this.anchor, { x: v, y: v }) }
  scale = { x: 1, y: 1, set: (v: number) => void Object.assign(this.scale, { x: v, y: v }) }
  private handlers = new Map<string, Set<Handler>>()

  on(type: string, handler: Handler) {
    const set = this.handlers.get(type) ?? new Set()
    set.add(handler)
    this.handlers.set(type, set)
    return this
  }
  off(type: string, handler: Handler) {
    this.handlers.get(type)?.delete(handler)
    return this
  }
  /** Test: phát một sự kiện con trỏ đến các trình xử lý đã gắn. */
  emit(type: string, event: unknown) {
    this.handlers.get(type)?.forEach((handler) => handler(event))
  }
  handlerCount(type: string) {
    return this.handlers.get(type)?.size ?? 0
  }
  addChild(child: Display) {
    return this.addChildAt(child, this.children.length)
  }
  addChildAt(child: Display, index: number) {
    child.parent?.removeChild(child)
    this.children.splice(index, 0, child)
    child.parent = this
    return child
  }
  removeChild(child: Display) {
    const i = this.children.indexOf(child)
    if (i >= 0) this.children.splice(i, 1)
    child.parent = null
    return child
  }
  destroy(options?: { children?: boolean }) {
    this.destroyed = true
    if (options?.children) this.children.forEach((child) => child.destroy(options))
  }
  /** Chuyển toạ độ toàn cục sang toạ độ cục bộ: chia cho tỉ lệ của nút (như Pixi thật khi `stage.scale` ≠ 1). */
  toLocal(point: { x: number; y: number }) {
    return { x: point.x / this.scale.x, y: point.y / this.scale.y }
  }
}

export class Container extends Display {}

export class Graphics extends Display {
  ops: unknown[][] = []
  clear() {
    this.ops = []
    return this
  }
  roundRect(...args: number[]) {
    this.ops.push(['roundRect', ...args])
    return this
  }
  circle(...args: number[]) {
    this.ops.push(['circle', ...args])
    return this
  }
  moveTo(...args: number[]) {
    this.ops.push(['moveTo', ...args])
    return this
  }
  arc(...args: number[]) {
    this.ops.push(['arc', ...args])
    return this
  }
  fill(color: number) {
    this.ops.push(['fill', color])
    return this
  }
  stroke(options: { width: number; color: number }) {
    this.ops.push(['stroke', options.width, options.color])
    return this
  }
}

export class TextStyle {
  readonly options: Record<string, unknown>
  constructor(options: Record<string, unknown>) {
    this.options = options
  }
}

export class Text extends Display {
  text: string
  style: TextStyle | undefined
  constructor(options?: { text?: string }) {
    super()
    this.text = options?.text ?? ''
  }
}

export class Rectangle {
  x: number
  y: number
  width: number
  height: number
  constructor(x: number, y: number, width: number, height: number) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
  }
}

export class Application {
  stage = new Container()
  canvas = document.createElement('canvas')
  initOptions: Record<string, unknown> | null = null
  destroyed = false
  destroyArgs: unknown[] | null = null
  render = vi.fn()
  postrenderListeners = new Set<{ postrender: () => void }>()
  renderer = {
    name: 'webgl',
    resize: vi.fn(),
    runners: {
      postrender: {
        add: (listener: { postrender: () => void }) => this.postrenderListeners.add(listener),
        remove: (listener: { postrender: () => void }) => this.postrenderListeners.delete(listener),
      },
    },
  }

  constructor() {
    control.apps.push(this)
  }

  init(options: Record<string, unknown>) {
    this.initOptions = options
    if (control.failInit) return Promise.reject(new Error('không có WebGL'))
    if (!control.holdInit) return Promise.resolve()
    return new Promise<void>((resolve) => control.releaseInit.push(resolve))
  }

  destroy(...args: unknown[]) {
    this.destroyed = true
    this.destroyArgs = args
    this.stage.destroy({ children: true })
  }
}
