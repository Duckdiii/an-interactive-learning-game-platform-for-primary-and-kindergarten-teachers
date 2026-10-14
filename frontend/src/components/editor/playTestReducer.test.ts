import { describe, expect, it } from 'vitest'
import { correctCount, createPlayTestState, playTestReducer } from './playTestReducer'

describe('playTestReducer', () => {
  it('bắt đầu ở câu đầu, chưa có kết quả nào', () => {
    expect(createPlayTestState(3)).toEqual({ index: 0, results: [null, null, null], answered: false, attempt: 0, finished: false })
  })

  it('ghi kết quả câu hiện tại; báo lại lần nữa thì bỏ qua (không đổi kết quả đã ghi)', () => {
    const once = playTestReducer(createPlayTestState(2), { type: 'answered', isCorrect: true })
    const twice = playTestReducer(once, { type: 'answered', isCorrect: false })

    expect(once.results).toEqual([true, null])
    expect(once.answered).toBe(true)
    expect(twice).toBe(once)
  })

  it('chưa trả lời thì không sang câu tiếp được', () => {
    const state = createPlayTestState(2)

    expect(playTestReducer(state, { type: 'next' })).toBe(state)
  })

  it('sang câu tiếp rồi kết thúc ở câu cuối', () => {
    let state = createPlayTestState(2)

    state = playTestReducer(state, { type: 'answered', isCorrect: true })
    state = playTestReducer(state, { type: 'next' })
    expect(state).toMatchObject({ index: 1, answered: false, finished: false })

    state = playTestReducer(state, { type: 'answered', isCorrect: false })
    state = playTestReducer(state, { type: 'next' })
    expect(state.finished).toBe(true)
    expect(correctCount(state)).toBe(1)
  })

  it('thử lại câu này: xóa kết quả câu đó, mở lại và đổi attempt để dựng lại renderer', () => {
    let state = createPlayTestState(2)

    state = playTestReducer(state, { type: 'answered', isCorrect: false })
    state = playTestReducer(state, { type: 'retryQuestion' })

    expect(state).toMatchObject({ index: 0, answered: false, attempt: 1 })
    expect(state.results[0]).toBeNull()

    state = playTestReducer(state, { type: 'answered', isCorrect: true })
    expect(state.results[0]).toBe(true)
  })

  it('chơi lại: về câu đầu, xóa sạch kết quả', () => {
    let state = createPlayTestState(2)

    state = playTestReducer(state, { type: 'answered', isCorrect: true })
    state = playTestReducer(state, { type: 'next' })
    state = playTestReducer(state, { type: 'answered', isCorrect: true })
    state = playTestReducer(state, { type: 'next' })

    expect(playTestReducer(state, { type: 'restart' })).toEqual(createPlayTestState(2))
  })
})
