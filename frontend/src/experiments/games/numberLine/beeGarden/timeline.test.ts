import { describe, expect, it, vi } from 'vitest'
import type { Ease, TweenFactory } from './beeFlight'
import { parallel, run, sequence, tween, Timeline, wait, type Scheduler, type Step } from './timeline'

/** Đồng hồ giả chạy tay. */
function clock() {
  let now = 0
  let nextId = 1
  const pending = new Map<number, { at: number; callback: () => void }>()
  const scheduler: Scheduler = {
    setTimer: (callback, ms) => {
      const id = nextId++
      pending.set(id, { at: now + ms, callback })
      return id
    },
    clearTimer: (handle) => void pending.delete(handle as number),
  }
  return {
    scheduler,
    get pending() {
      return pending.size
    },
    advance(ms: number) {
      const target = now + ms
      for (;;) {
        const due = [...pending.entries()].filter(([, timer]) => timer.at <= target).sort((a, b) => a[1].at - b[1].at)[0]
        if (!due) break
        pending.delete(due[0])
        now = due[1].at
        due[1].callback()
      }
      now = target
    },
  }
}

function fakeTweens() {
  const made: { node: unknown; attrs: Record<string, number>; seconds: number; ease: Ease; played: boolean; destroyed: boolean; finish: () => void }[] = []
  const factory: TweenFactory = (node, attrs, seconds, ease, onFinish) => {
    const record = { node, attrs: { ...attrs }, seconds, ease, played: false, destroyed: false, finish: onFinish }
    made.push(record)
    return { play: () => void (record.played = true), destroy: () => void (record.destroyed = true) }
  }
  return { factory, made }
}

describe('các bước cơ bản', () => {
  it('wait: xong sau đúng khoảng thời gian; số âm hoặc NaN coi như 0; hủy thì không báo xong', () => {
    const c = clock()
    const done = vi.fn()
    wait(0.5, c.scheduler)(done)
    c.advance(499)
    expect(done).not.toHaveBeenCalled()
    c.advance(2)
    expect(done).toHaveBeenCalledTimes(1)
    const zero = vi.fn()
    wait(-3, c.scheduler)(zero)
    wait(Number.NaN, c.scheduler)(zero)
    c.advance(0)
    expect(zero).toHaveBeenCalledTimes(2)
    const cancelled = vi.fn()
    const cancel = wait(1, c.scheduler)(cancelled)!
    cancel()
    c.advance(5000)
    expect(cancelled).not.toHaveBeenCalled()
    expect(c.pending).toBe(0)
  })
  it('run: làm việc ngay rồi xong ngay', () => {
    const action = vi.fn()
    const done = vi.fn()
    run(action)(done)
    expect(action).toHaveBeenCalledTimes(1)
    expect(done).toHaveBeenCalledTimes(1)
  })
})

describe('sequence', () => {
  it('chạy lần lượt: bước sau chỉ bắt đầu khi bước trước xong, theo đúng thứ tự', () => {
    const c = clock()
    const log: string[] = []
    const step = sequence(run(() => log.push('a')), wait(0.2, c.scheduler), run(() => log.push('b')), wait(0.3, c.scheduler), run(() => log.push('c')))
    const done = vi.fn(() => log.push('xong'))
    step(done)
    expect(log).toEqual(['a'])
    c.advance(200)
    expect(log).toEqual(['a', 'b'])
    c.advance(299)
    expect(log).toEqual(['a', 'b'])
    c.advance(2)
    expect(log).toEqual(['a', 'b', 'c', 'xong'])
    expect(done).toHaveBeenCalledTimes(1)
  })
  it('rỗng thì xong ngay; hủy giữa chừng thì dừng, không chạy bước sau, không báo xong, dọn hẹn giờ', () => {
    const done = vi.fn()
    sequence()(done)
    expect(done).toHaveBeenCalledTimes(1)
    const c = clock()
    const after = vi.fn()
    const finished = vi.fn()
    const cancel = sequence(wait(1, c.scheduler), run(after))(finished)!
    c.advance(500)
    cancel()
    c.advance(5000)
    expect(after).not.toHaveBeenCalled()
    expect(finished).not.toHaveBeenCalled()
    expect(c.pending).toBe(0)
  })
})

describe('parallel', () => {
  it('cùng bắt đầu; xong khi bước chậm nhất xong', () => {
    const c = clock()
    const starts: string[] = []
    const done = vi.fn()
    parallel(
      sequence(run(() => starts.push('a')), wait(0.2, c.scheduler)),
      sequence(run(() => starts.push('b')), wait(0.5, c.scheduler)),
      run(() => starts.push('c')),
    )(done)
    expect(starts).toEqual(['a', 'b', 'c'])
    c.advance(300)
    expect(done).not.toHaveBeenCalled()
    c.advance(250)
    expect(done).toHaveBeenCalledTimes(1)
  })
  it('một bước báo xong hai lần không làm xong sớm; rỗng thì xong ngay; hủy thì hủy tất cả bước con', () => {
    const doneTwice: Step = (done) => {
      done()
      done()
    }
    const c = clock()
    const done = vi.fn()
    parallel(doneTwice, wait(1, c.scheduler))(done)
    expect(done).not.toHaveBeenCalled()
    c.advance(1000)
    expect(done).toHaveBeenCalledTimes(1)
    const empty = vi.fn()
    parallel()(empty)
    expect(empty).toHaveBeenCalledTimes(1)
    const cancel = parallel(wait(1, c.scheduler), wait(2, c.scheduler))(vi.fn())!
    expect(c.pending).toBe(2)
    cancel()
    expect(c.pending).toBe(0)
  })
})

describe('tween', () => {
  it('tạo tween đúng node, thuộc tính, thời gian, easing rồi phát; xong thì báo; hủy thì hủy tween', () => {
    const { factory, made } = fakeTweens()
    const node = { id: 'bảng' }
    const done = vi.fn()
    const cancel = tween(factory, node, { y: 0, opacity: 1 }, 0.7, 'bounce')(done)!
    expect(made).toHaveLength(1)
    expect(made[0]).toMatchObject({ node, attrs: { y: 0, opacity: 1 }, seconds: 0.7, ease: 'bounce', played: true })
    made[0].finish()
    expect(done).toHaveBeenCalledTimes(1)
    cancel()
    expect(made[0].destroyed).toBe(true)
  })
})

describe('Timeline', () => {
  it('play chạy kịch bản, running đúng trạng thái, báo xong một lần', () => {
    const c = clock()
    const timeline = new Timeline()
    const done = vi.fn()
    expect(timeline.running).toBe(false)
    timeline.play(wait(1, c.scheduler), done)
    expect(timeline.running).toBe(true)
    c.advance(1000)
    expect(timeline.running).toBe(false)
    expect(done).toHaveBeenCalledTimes(1)
  })
  it('cancel dừng kịch bản đang chạy (không báo xong, dọn hẹn giờ); hủy lần hai hoặc khi đã xong vô hại', () => {
    const c = clock()
    const timeline = new Timeline()
    const done = vi.fn()
    timeline.play(sequence(wait(1, c.scheduler), run(done)))
    timeline.cancel()
    timeline.cancel()
    c.advance(5000)
    expect(done).not.toHaveBeenCalled()
    expect(c.pending).toBe(0)
    expect(timeline.running).toBe(false)
  })
  it('play kịch bản mới thay kịch bản cũ: cái cũ bị hủy hẳn, không báo xong muộn', () => {
    const c = clock()
    const timeline = new Timeline()
    const first = vi.fn()
    const second = vi.fn()
    timeline.play(wait(1, c.scheduler), first)
    timeline.play(wait(0.5, c.scheduler), second)
    c.advance(5000)
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })
  it('báo xong muộn của kịch bản đã bị thay (bước không hủy được) bị bỏ qua', () => {
    const timeline = new Timeline()
    let lateDone: (() => void) | null = null
    const first = vi.fn()
    timeline.play((done) => {
      lateDone = done
    }, first)
    timeline.play(run(() => undefined))
    ;(lateDone as unknown as () => void)()
    expect(first).not.toHaveBeenCalled()
  })
})
