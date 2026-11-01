import { describe, expect, it } from 'vitest'
import { classSummary, currentId, initialPresentState, outcomeOf, presentReducer, recordOf } from './presentReducer'
import type { PresentAction, PresentState } from './presentReducer'

const run = (actions: PresentAction[], ids = ['a', 'b', 'c']): PresentState => actions.reduce(presentReducer, initialPresentState(ids))
const outcome = (state: PresentState, id: string) => outcomeOf(recordOf(state, id))

describe('presentReducer', () => {
  it('next/prev chặn biên; next ở câu cuối sang kết quả', () => {
    expect(run([{ type: 'prev' }]).index).toBe(0)
    expect(run([{ type: 'next' }, { type: 'next' }]).index).toBe(2)

    const done = run([{ type: 'next' }, { type: 'next' }, { type: 'next' }])

    expect(done.phase).toBe('result')
    expect(done.index).toBe(2)
  })

  it('đổi câu đặt lại gợi ý và lần thử', () => {
    const state = run([{ type: 'hint' }, { type: 'next' }])

    expect(state.hint).toBe(0)
    expect(state.attempt).toBe(0)
  })

  it('đúng ngay lần đầu là firstTry; sai là notYet', () => {
    expect(outcome(run([{ type: 'answered', isCorrect: true }]), 'a')).toBe('firstTry')
    expect(outcome(run([{ type: 'answered', isCorrect: false }]), 'a')).toBe('notYet')
    expect(outcome(run([]), 'a')).toBe('notYet')
  })

  it('sai rồi cho thử lại và đúng thì là afterRetry, tăng key renderer', () => {
    const state = run([{ type: 'answered', isCorrect: false }, { type: 'retry' }, { type: 'answered', isCorrect: true }])

    expect(outcome(state, 'a')).toBe('afterRetry')
    expect(state.attempt).toBe(1)
  })

  it('thử lại khi chưa trả lời thì không làm gì', () => {
    expect(run([{ type: 'retry' }]).attempt).toBe(0)
  })

  it('đã đúng ngay lần đầu thì thử lại hay sai sau đó không làm mất', () => {
    const state = run([{ type: 'answered', isCorrect: true }, { type: 'retry' }, { type: 'answered', isCorrect: false }])

    expect(outcome(state, 'a')).toBe('firstTry')
    // Nhân vật nói theo lần vừa chơi (sai), không theo kết quả dính.
    expect(recordOf(state, 'a').lastCorrect).toBe(false)
  })

  it('restart từ màn kết quả: về câu 1, xoá kết quả cũ', () => {
    const ended = run([{ type: 'answered', isCorrect: true }, { type: 'end' }])

    expect(presentReducer(ended, { type: 'restart' })).toEqual(initialPresentState(['a', 'b', 'c']))
  })

  it('answeredHere: bật khi vừa trả lời; tắt khi chuyển câu, quay lại hoặc thử lại', () => {
    const answered = run([{ type: 'answered', isCorrect: true }])

    expect(answered.answeredHere).toBe(true)
    expect(presentReducer(presentReducer(answered, { type: 'next' }), { type: 'prev' }).answeredHere).toBe(false)
    expect(presentReducer(answered, { type: 'retry' }).answeredHere).toBe(false)
  })

  it('không chấm lần hai khi đã có kết quả', () => {
    expect(outcome(run([{ type: 'answered', isCorrect: false }, { type: 'answered', isCorrect: true }]), 'a')).toBe('notYet')
  })

  it('gợi ý tối đa hai mức, không gợi ý khi đã trả lời', () => {
    expect(run([{ type: 'hint' }]).hint).toBe(1)
    expect(run([{ type: 'hint' }, { type: 'hint' }, { type: 'hint' }]).hint).toBe(2)
    expect(run([{ type: 'answered', isCorrect: true }, { type: 'hint' }]).hint).toBe(0)
  })

  it('tạm dừng chặn mọi hành động trừ tiếp tục và kết thúc', () => {
    const paused = run([{ type: 'pause' }])

    for (const type of ['next', 'prev', 'hint', 'retry'] as const) expect(presentReducer(paused, { type })).toBe(paused)
    expect(presentReducer(paused, { type: 'answered', isCorrect: true })).toBe(paused)
    expect(presentReducer(paused, { type: 'resume' }).paused).toBe(false)

    const ended = presentReducer(paused, { type: 'end' })

    expect(ended.phase).toBe('result')
    expect(ended.paused).toBe(false)
  })

  it('sang kết quả rồi thì mọi hành động bị bỏ qua', () => {
    const ended = run([{ type: 'end' }])

    for (const action of [{ type: 'next' }, { type: 'prev' }, { type: 'pause' }, { type: 'answered', isCorrect: true }] as PresentAction[]) {
      expect(presentReducer(ended, action)).toBe(ended)
    }
  })

  it('game không có câu nào: không vỡ', () => {
    const state = run([{ type: 'answered', isCorrect: true }, { type: 'next' }], [])

    expect(currentId(state)).toBeUndefined()
    expect(classSummary(state)).toEqual({ total: 0, correct: 0, retried: 0 })
  })

  it('classSummary đếm cả lớp: đúng, và số câu phải thử lại', () => {
    const state = run([
      { type: 'answered', isCorrect: true },
      { type: 'next' },
      { type: 'answered', isCorrect: false },
      { type: 'retry' },
      { type: 'answered', isCorrect: true },
      { type: 'next' },
      { type: 'answered', isCorrect: false },
    ])

    expect(classSummary(state)).toEqual({ total: 3, correct: 2, retried: 1 })
  })
})
