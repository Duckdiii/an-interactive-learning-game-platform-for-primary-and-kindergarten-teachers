import type { Ease, TweenFactory, TweenLike } from './beeFlight'

/**
 * «Kịch bản» chuyển động dễ đọc, hủy và dọn được: các bước nối tiếp (`sequence`), chạy cùng lúc (`parallel`), chờ (`wait`), làm một việc ngay (`run`), hay tween một node (`tween`).
 * Một kịch bản là một biểu thức, ví dụ «ong bay → hoa nảy → pháo → hoa bay lên thanh»: đọc từ trên xuống là hiểu thứ tự, không rải `setTimeout` khắp nơi.
 *
 * Không biết gì về Konva hay React: tween đi qua `TweenFactory` (test thay bằng tween giả) và hẹn giờ đi qua `Scheduler` (test thay bằng đồng hồ giả).
 * Hủy một kịch bản dừng mọi hẹn giờ và tween đang chạy, không gọi `onDone`; hủy hai lần hoặc hủy khi đã xong đều vô hại.
 */
export type Cancel = () => void
/** Một bước: bắt đầu chạy, gọi `done` đúng một lần khi xong; trả hàm hủy (tùy chọn). */
export type Step = (done: () => void) => Cancel | void

export interface Scheduler {
  setTimer(callback: () => void, ms: number): unknown
  clearTimer(handle: unknown): void
}

export const realScheduler: Scheduler = {
  setTimer: (callback, ms) => setTimeout(callback, ms),
  clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

/** Chờ `seconds` giây (số âm hoặc không hợp lệ coi như 0). */
export const wait =
  (seconds: number, scheduler: Scheduler = realScheduler): Step =>
  (done) => {
    const handle = scheduler.setTimer(done, Math.max(0, Number.isFinite(seconds) ? seconds : 0) * 1000)
    return () => scheduler.clearTimer(handle)
  }

/** Làm một việc ngay rồi coi như xong (không chờ gì). */
export const run =
  (action: () => void): Step =>
  (done) => {
    action()
    done()
  }

/** Các bước lần lượt, bước sau chỉ bắt đầu khi bước trước xong; rỗng thì xong ngay. */
export const sequence =
  (...steps: Step[]): Step =>
  (done) => {
    let cancelled = false
    let cancelCurrent: Cancel | void = undefined
    const next = (index: number) => {
      if (cancelled) return
      if (index >= steps.length) {
        done()
        return
      }
      cancelCurrent = steps[index](() => next(index + 1))
    }
    next(0)
    return () => {
      cancelled = true
      cancelCurrent?.()
    }
  }

/** Các bước cùng bắt đầu; xong khi TẤT CẢ xong (rỗng thì xong ngay). */
export const parallel =
  (...steps: Step[]): Step =>
  (done) => {
    if (steps.length === 0) {
      done()
      return
    }
    let remaining = steps.length
    let cancelled = false
    const cancels: (Cancel | void)[] = []
    for (const step of steps) {
      let finished = false
      cancels.push(
        step(() => {
          if (finished || cancelled) return
          finished = true
          remaining -= 1
          if (remaining === 0) done()
        }),
      )
    }
    return () => {
      cancelled = true
      for (const cancel of cancels) cancel?.()
    }
  }

/** Tween một node tới `attrs` trong `seconds` giây (qua `TweenFactory`); xong thì báo. Hủy thì hủy tween. */
export const tween =
  (factory: TweenFactory, node: unknown, attrs: Readonly<Record<string, number>>, seconds: number, ease: Ease): Step =>
  (done) => {
    const handle: TweenLike = factory(node, attrs, seconds, ease, done)
    handle.play()
    return () => handle.destroy()
  }

/** Chạy một kịch bản và giữ hàm hủy: `play()` thay kịch bản đang chạy (nếu có), `cancel()` dừng hẳn. */
export class Timeline {
  private cancelCurrent: Cancel | void = undefined
  private runId = 0
  private active = false

  get running(): boolean {
    return this.active
  }

  play(step: Step, onDone?: () => void): void {
    this.cancel()
    const id = this.runId
    this.active = true
    this.cancelCurrent = step(() => {
      if (id !== this.runId) return
      this.active = false
      this.cancelCurrent = undefined
      onDone?.()
    })
  }

  cancel(): void {
    this.runId += 1
    this.active = false
    const cancel = this.cancelCurrent
    this.cancelCurrent = undefined
    cancel?.()
  }
}
