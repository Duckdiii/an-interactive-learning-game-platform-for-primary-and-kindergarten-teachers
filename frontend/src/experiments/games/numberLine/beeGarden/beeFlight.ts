/**
 * Chuyến bay của chú ong qua từng bông hoa, điều khiển bằng Tween (Konva) CHẠY TRỰC TIẾP TRÊN NODE, không qua state của React,
 * nên không vẽ lại cả cây React mỗi khung hình. Lớp này không biết gì về Konva: nhận `TweenFactory` (xem `konvaTween.ts`) để test
 * được bằng tween giả trong jsdom (không có Canvas).
 *
 * Mỗi bước bay (từ hoa này sang hoa kế) gồm ba tween chạy cùng lúc: x đi theo đường êm hai đầu; y lên đỉnh cung rồi hạ xuống
 * (quỹ đạo cong nhẹ). Bay xong bước nào thì báo `onArrive(bước)` (để hoa nảy và kêu một nốt) rồi mới sang bước kế.
 */
/** `bounce`: chạm đích rồi nảy lên vài lần (bảng gỗ rơi xuống); `back`: vọt quá đích một chút rồi về (huy hiệu xoay vào). */
export type Ease = 'inOut' | 'out' | 'in' | 'bounce' | 'back'

export interface TweenLike {
  play(): void
  destroy(): void
}

/** Phần của node Konva mà chuyến bay cần: đọc/ghi x và y. */
export interface TweenNode {
  x(): number
  y(): number
  x(value: number): unknown
  y(value: number): unknown
  scaleX?(value: number): unknown
  scaleY?(value: number): unknown
}

/** Tạo (chưa phát) một tween đưa `attrs` của `node` tới giá trị đích trong `seconds` giây; gọi `onFinish` khi xong. */
export type TweenFactory = (node: unknown, attrs: Readonly<Record<string, number>>, seconds: number, ease: Ease, onFinish: () => void) => TweenLike

export interface FlightPlan {
  /** Toạ độ x của từng hoa sẽ đi qua, theo thứ tự; hoa cuối là đích. Rỗng thì không bay. */
  stops: readonly number[]
  /** Độ cao nghỉ của ong (y) và độ cao đỉnh cung (số đơn vị nhấc lên). */
  restY: number
  arc: number
  /** Thời gian của một bước bay (giây). */
  hopSeconds: number
  /** Không chuyển động (người dùng chọn «giảm chuyển động»): nhảy thẳng tới hoa cuối, chỉ báo đã tới hoa cuối. */
  instant?: boolean
  /**
   * Co giãn khi bay (squash & stretch): tỉ lệ gốc của node. Cất cánh thì vươn dài (hẹp, cao), hạ cánh thì bẹp (rộng, thấp) rồi về `squash`.
   * Bỏ trống thì không co giãn. Luôn là chuyển động ngắn (dưới một nửa bước bay) nên không làm chuyến bay chậm đi.
   */
  squash?: number
  /** Thời gian riêng cho bước bay ĐẦU (ví dụ lướt một đoạn dài về vạch đầu rồi mới đếm); bỏ trống thì như các bước khác. */
  firstHopSeconds?: number
}

/** Hệ số co giãn: cất cánh vươn (hẹp × cao), hạ cánh bẹp (rộng × thấp). */
export const STRETCH = { x: 0.9, y: 1.14 } as const
export const LANDING_SQUASH = { x: 1.16, y: 0.86 } as const
export const SQUASH_SECONDS = { stretch: 0.1, recover: 0.2, land: 0.07, settle: 0.14 } as const

export interface FlightCallbacks {
  /** Đã tới hoa thứ `stop` của kế hoạch (từ 0). */
  onArrive: (stop: number) => void
  /** Đã tới hoa cuối. Gọi đúng một lần, sau `onArrive` của hoa cuối; không gọi nếu bị hủy. */
  onDone: () => void
}

export const BOUNCE_UP_SECONDS = 0.09
export const BOUNCE_DOWN_SECONDS = 0.12
/** Hoa «nở» khi trả lời đúng: lên chậm hơn và trở về chậm hơn nảy thường, để trẻ kịp thấy. */
export const BLOOM_TIMING = { up: 0.2, down: 0.45 } as const

export interface BounceTiming {
  up: number
  down: number
}

export class BeeFlight {
  private flightTweens: TweenLike[] = []
  private bounceTweens: TweenLike[] = []
  private squashTweens: TweenLike[] = []
  private squashNode: { node: TweenNode; base: number } | null = null
  private runId = 0
  private active = false

  private readonly factory: TweenFactory

  constructor(factory: TweenFactory) {
    this.factory = factory
  }

  /** Đang có một chuyến bay chưa xong (cả khi đang nảy hoa). */
  get flying(): boolean {
    return this.active
  }

  start(node: TweenNode, plan: FlightPlan, callbacks: FlightCallbacks): void {
    this.cancel()
    const id = this.runId
    const { stops } = plan
    if (stops.length === 0) {
      callbacks.onDone()
      return
    }
    if (plan.instant) {
      node.x(stops[stops.length - 1])
      node.y(plan.restY)
      callbacks.onArrive(stops.length - 1)
      callbacks.onDone()
      return
    }
    this.active = true
    const squash = plan.squash
    if (squash !== undefined && node.scaleX && node.scaleY) this.squashNode = { node, base: squash }
    /** Một tween co giãn độc lập với bước bay (không tính vào `pending`); chuỗi các bước co giãn nối nhau, bước sau thay bước trước nếu còn dở. */
    const shape = (x: number, y: number, seconds: number, ease: Ease, then?: () => void) => {
      if (squash === undefined || !node.scaleX) return
      const tween = this.factory(node, { scaleX: squash * x, scaleY: squash * y }, seconds, ease, () => {
        if (id === this.runId) then?.()
      })
      this.squashTweens.push(tween)
      tween.play()
    }
    const hop = (index: number) => {
      let pending = 2
      const finished = () => {
        if (id !== this.runId) return
        pending -= 1
        if (pending > 0) return
        this.destroyAll(this.flightTweens)
        node.y(plan.restY)
        callbacks.onArrive(index)
        // Hạ cánh: bẹp xuống một nhịp rồi bật về (bước kế tiếp, nếu có, sẽ vươn ra từ dáng này).
        shape(LANDING_SQUASH.x, LANDING_SQUASH.y, SQUASH_SECONDS.land, 'out', () => shape(1, 1, SQUASH_SECONDS.settle, 'out'))
        if (index + 1 < stops.length) {
          hop(index + 1)
          return
        }
        this.active = false
        callbacks.onDone()
      }
      const seconds = index === 0 && plan.firstHopSeconds !== undefined ? plan.firstHopSeconds : plan.hopSeconds
      const half = seconds / 2
      shape(STRETCH.x, STRETCH.y, SQUASH_SECONDS.stretch, 'out', () => shape(1, 1, SQUASH_SECONDS.recover, 'inOut'))
      const sideways = this.factory(node, { x: stops[index] }, seconds, 'inOut', finished)
      const up = this.factory(node, { y: plan.restY - plan.arc }, half, 'out', () => {
        if (id !== this.runId) return
        const down = this.factory(node, { y: plan.restY }, half, 'in', finished)
        this.flightTweens.push(down)
        down.play()
      })
      this.flightTweens.push(sideways, up)
      sideways.play()
      up.play()
    }
    hop(0)
  }

  /** Bông hoa nảy lên rồi về cỡ cũ (`base` là tỉ lệ gốc của hoa). */
  bounce(node: unknown, base: number, peak: number, timing: BounceTiming = { up: BOUNCE_UP_SECONDS, down: BOUNCE_DOWN_SECONDS }): void {
    const up = this.factory(node, { scaleX: base * peak, scaleY: base * peak }, timing.up, 'out', () => {
      const down = this.factory(node, { scaleX: base, scaleY: base }, timing.down, 'in', () => undefined)
      this.bounceTweens.push(down)
      down.play()
    })
    this.bounceTweens.push(up)
    up.play()
  }

  /** Dừng chuyến bay đang chạy (không gọi `onArrive`/`onDone` nữa) và các hoa đang nảy. Hoa đang nảy dở sẽ được đặt lại cỡ gốc bởi người gọi. */
  cancel(): void {
    this.runId += 1
    this.active = false
    this.destroyAll(this.flightTweens)
    this.destroyAll(this.bounceTweens)
    this.destroyAll(this.squashTweens)
    // Co giãn dở dang thì trả ong về đúng cỡ gốc (không để ong méo).
    if (this.squashNode) {
      this.squashNode.node.scaleX?.(this.squashNode.base)
      this.squashNode.node.scaleY?.(this.squashNode.base)
      this.squashNode = null
    }
  }

  private destroyAll(list: TweenLike[]): void {
    for (const tween of list.splice(0)) tween.destroy()
  }
}
