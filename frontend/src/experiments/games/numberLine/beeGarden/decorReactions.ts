import type { Ease, TweenFactory } from './beeFlight'
import type { DecorationReaction } from '../../../theme/themeTypes'

/**
 * Phản ứng nhỏ khi trẻ chạm vào bướm, bồ câu, bọ rùa, ốc sên, nấm: vật «sống dậy» một chút (nhảy, lắc, nảy, đập cánh) rồi về chỗ cũ.
 * Mỗi phản ứng là một chuỗi bước tween trên node Konva (không qua React) và LUÔN ngắn hơn `MAX_REACTION_SECONDS`.
 * Chạm vật trang trí không phải trả lời: nó không bao giờ đổi giá trị, không chấm, không đưa ong đi.
 *
 * Bước dùng các thuộc tính: `scaleX/scaleY` (bóp méo co giãn, tuyệt đối: 1 là cỡ gốc), `reactY` (nhấc lên, đơn vị thiết kế, âm là lên) và
 * `reactRot` (độ). `reactY`/`reactRot` là thuộc tính riêng mà `gardenMotion` cộng thêm vào chuyển động nền để hai bên không giành nhau.
 */
export const MAX_REACTION_SECONDS = 1.2

export interface ReactionStep {
  attrs: Readonly<Record<string, number>>
  seconds: number
  ease: Ease
}

const step = (seconds: number, ease: Ease, attrs: Record<string, number>): ReactionStep => ({ seconds, ease, attrs })

/** Chuỗi bước của một phản ứng; `none` thì rỗng. Bước cuối luôn trả cỡ, độ nhấc và góc về 0 (về trạng thái nghỉ). */
export function reactionSteps(kind: DecorationReaction | undefined): readonly ReactionStep[] {
  switch (kind) {
    case 'hop':
      return [
        step(0.08, 'out', { scaleX: 1.15, scaleY: 0.85 }),
        step(0.22, 'out', { scaleX: 0.9, scaleY: 1.15, reactY: -26 }),
        step(0.18, 'in', { scaleX: 1.12, scaleY: 0.88, reactY: 0 }),
        step(0.15, 'out', { scaleX: 1, scaleY: 1 }),
      ]
    case 'wiggle':
      return [
        step(0.1, 'out', { reactRot: 14, reactY: -8 }),
        step(0.1, 'inOut', { reactRot: -14, reactY: 0 }),
        step(0.1, 'inOut', { reactRot: 10, reactY: -5 }),
        step(0.1, 'inOut', { reactRot: -6, reactY: 0 }),
        step(0.12, 'out', { reactRot: 0, reactY: 0 }),
      ]
    case 'boing':
      return [
        step(0.1, 'out', { scaleX: 1.3, scaleY: 0.7 }),
        step(0.15, 'out', { scaleX: 0.8, scaleY: 1.25 }),
        step(0.15, 'inOut', { scaleX: 1.1, scaleY: 0.92 }),
        step(0.2, 'out', { scaleX: 1, scaleY: 1 }),
      ]
    case 'flutter':
      return [
        step(0.3, 'out', { reactY: -40, reactRot: 12, scaleX: 0.9, scaleY: 1.1 }),
        step(0.15, 'inOut', { reactRot: -12 }),
        step(0.15, 'inOut', { reactRot: 8 }),
        step(0.3, 'in', { reactY: 0, reactRot: 0, scaleX: 1, scaleY: 1 }),
      ]
    default:
      return []
  }
}

export function reactionSeconds(kind: DecorationReaction | undefined): number {
  return reactionSteps(kind).reduce((sum, item) => sum + item.seconds, 0)
}

/** Phần của node mà bộ phản ứng cần đọc/ghi để trả vật về chỗ nghỉ khi xong. */
export interface ReactiveNode {
  getAttr(name: string): unknown
  y(value: number): unknown
  rotation(value: number): unknown
  scaleX(value: number): unknown
  scaleY(value: number): unknown
  setAttr(name: string, value: number): unknown
}

/** Chạy các phản ứng. Mỗi vật chỉ chạy một phản ứng một lúc (chạm dồn lúc đang phản ứng thì bỏ qua), `cancel` dừng hết khi đóng màn. */
export class DecorReactor {
  private readonly busy = new Set<ReactiveNode>()
  private readonly running = new Map<ReactiveNode, { destroy(): void }>()
  private readonly factory: TweenFactory

  constructor(factory: TweenFactory) {
    this.factory = factory
  }

  /** Trả `true` nếu bắt đầu phản ứng, `false` nếu không có phản ứng hoặc vật đang bận. */
  react(node: ReactiveNode, kind: DecorationReaction | undefined): boolean {
    const steps = reactionSteps(kind)
    if (steps.length === 0 || this.busy.has(node)) return false
    this.busy.add(node)
    const run = (index: number) => {
      if (!this.busy.has(node)) return
      if (index >= steps.length) {
        this.rest(node)
        return
      }
      const { attrs, seconds, ease } = steps[index]
      const tween = this.factory(node, attrs, seconds, ease, () => run(index + 1))
      this.running.set(node, tween)
      tween.play()
    }
    run(0)
    return true
  }

  isBusy(node: ReactiveNode): boolean {
    return this.busy.has(node)
  }

  /** Dừng mọi phản ứng đang chạy và trả các vật về trạng thái nghỉ. */
  cancel(): void {
    for (const tween of this.running.values()) tween.destroy()
    this.running.clear()
    for (const node of [...this.busy]) this.rest(node)
  }

  private rest(node: ReactiveNode): void {
    this.busy.delete(node)
    this.running.delete(node)
    node.setAttr('reactY', 0)
    node.setAttr('reactRot', 0)
    node.scaleX(1)
    node.scaleY(1)
    // Chuyển động nền chỉ tự đặt lại y (bồng bềnh) và góc (đung đưa); vật kiểu khác phải được trả về đúng chỗ ở đây.
    const kind = node.getAttr('motionKind')
    if (kind !== 'float') {
      const baseY = node.getAttr('motionBaseY')
      if (typeof baseY === 'number') node.y(baseY)
    }
    if (kind !== 'sway') node.rotation(0)
  }
}
