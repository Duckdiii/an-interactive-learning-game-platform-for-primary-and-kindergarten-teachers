import { describe, expect, it } from 'vitest'
import {
  canSubmit,
  createMatchingState,
  isLeftLinked,
  isRightLinked,
  matchingReducer,
  type MatchingAction,
  type MatchingState,
} from './matchingReducer'

function run(actions: MatchingAction[], from: MatchingState = createMatchingState()): MatchingState {
  return actions.reduce(matchingReducer, from)
}

const link = (leftPairId: string, rightPairId: string) => ({ leftPairId, rightPairId })

describe('matchingReducer — chọn và nối', () => {
  it('trạng thái đầu: chưa chọn gì, chưa nối, đang nối', () => {
    expect(createMatchingState()).toEqual({ selectedLeftId: null, links: [], phase: 'pairing' })
  })

  it('chạm ô trái chưa nối thì chọn nó', () => {
    const state = run([{ type: 'tapLeft', id: 'l1' }])

    expect(state.selectedLeftId).toBe('l1')
    expect(state.links).toEqual([])
  })

  it('chạm lại đúng ô trái đang chọn thì bỏ chọn', () => {
    const state = run([
      { type: 'tapLeft', id: 'l1' },
      { type: 'tapLeft', id: 'l1' },
    ])

    expect(state.selectedLeftId).toBeNull()
  })

  it('chạm ô trái khác khi đang chọn thì đổi lựa chọn sang ô mới', () => {
    const state = run([
      { type: 'tapLeft', id: 'l1' },
      { type: 'tapLeft', id: 'l2' },
    ])

    expect(state.selectedLeftId).toBe('l2')
  })

  it('chọn trái rồi chạm phải thì nối cặp và bỏ chọn', () => {
    const state = run([
      { type: 'tapLeft', id: 'l1' },
      { type: 'tapRight', id: 'r2' },
    ])

    expect(state.links).toEqual([link('l1', 'r2')])
    expect(state.selectedLeftId).toBeNull()
    expect(isLeftLinked(state, 'l1')).toBe(true)
    expect(isRightLinked(state, 'r2')).toBe(true)
    expect(isLeftLinked(state, 'l2')).toBe(false)
  })

  it('chạm phải khi chưa chọn trái và ô phải chưa nối thì bỏ qua', () => {
    const before = createMatchingState()

    expect(matchingReducer(before, { type: 'tapRight', id: 'r1' })).toBe(before)
  })

  it('nối được nhiều cặp độc lập', () => {
    const state = run([
      { type: 'tapLeft', id: 'l1' },
      { type: 'tapRight', id: 'r1' },
      { type: 'tapLeft', id: 'l2' },
      { type: 'tapRight', id: 'r2' },
    ])

    expect(state.links).toEqual([link('l1', 'r1'), link('l2', 'r2')])
  })
})

describe('matchingReducer — gỡ và nối lại', () => {
  const twoLinked = run([
    { type: 'tapLeft', id: 'l1' },
    { type: 'tapRight', id: 'r1' },
    { type: 'tapLeft', id: 'l2' },
    { type: 'tapRight', id: 'r2' },
  ])

  it('chạm ô trái đã nối thì gỡ cặp đó, các cặp khác giữ nguyên', () => {
    const state = run([{ type: 'tapLeft', id: 'l1' }], twoLinked)

    expect(state.links).toEqual([link('l2', 'r2')])
    expect(state.selectedLeftId).toBeNull()
  })

  it('chạm ô phải đã nối (không chọn trái) thì gỡ cặp đó', () => {
    const state = run([{ type: 'tapRight', id: 'r2' }], twoLinked)

    expect(state.links).toEqual([link('l1', 'r1')])
  })

  it('nối ô trái mới vào ô phải đã nối thì chuyển cặp sang ô trái mới, không để một ô phải thuộc hai cặp', () => {
    const state = run(
      [
        { type: 'tapLeft', id: 'l3' },
        { type: 'tapRight', id: 'r1' },
      ],
      twoLinked,
    )

    expect(state.links).toEqual([link('l2', 'r2'), link('l3', 'r1')])
    expect(isLeftLinked(state, 'l1')).toBe(false)
  })

  it('luôn mỗi ô trái tối đa một cặp và mỗi ô phải tối đa một cặp', () => {
    const state = run([
      { type: 'tapLeft', id: 'l1' },
      { type: 'tapRight', id: 'r1' },
      { type: 'tapLeft', id: 'l2' },
      { type: 'tapRight', id: 'r1' },
      { type: 'tapLeft', id: 'l3' },
      { type: 'tapRight', id: 'r1' },
    ])

    expect(state.links).toEqual([link('l3', 'r1')])
  })
})

describe('matchingReducer — nộp bài', () => {
  const allLinked = run([
    { type: 'tapLeft', id: 'l1' },
    { type: 'tapRight', id: 'r1' },
    { type: 'tapLeft', id: 'l2' },
    { type: 'tapRight', id: 'r2' },
  ])

  it('canSubmit chỉ đúng khi đang nối và đã nối đủ số cặp', () => {
    expect(canSubmit(createMatchingState(), 2)).toBe(false)
    expect(canSubmit(run([{ type: 'tapLeft', id: 'l1' }, { type: 'tapRight', id: 'r1' }]), 2)).toBe(false)
    expect(canSubmit(allLinked, 2)).toBe(true)
    expect(canSubmit(allLinked, 3)).toBe(false)
    expect(canSubmit(createMatchingState(), 0)).toBe(false)
  })

  it('submitStart khi nối đủ thì sang submitting', () => {
    const state = run([{ type: 'submitStart', total: 2 }], allLinked)

    expect(state.phase).toBe('submitting')
    expect(state.links).toEqual(allLinked.links)
  })

  it('submitStart khi chưa nối đủ thì bị bỏ qua', () => {
    const partial = run([{ type: 'tapLeft', id: 'l1' }, { type: 'tapRight', id: 'r1' }])

    expect(matchingReducer(partial, { type: 'submitStart', total: 2 })).toBe(partial)
  })

  it('đang nộp hoặc đã xong thì khoá hết chạm, không đổi cặp nào', () => {
    const submitting = run([{ type: 'submitStart', total: 2 }], allLinked)
    const done = run([{ type: 'submitDone' }], submitting)

    for (const locked of [submitting, done]) {
      expect(matchingReducer(locked, { type: 'tapLeft', id: 'l1' })).toBe(locked)
      expect(matchingReducer(locked, { type: 'tapRight', id: 'r1' })).toBe(locked)
    }
  })

  it('không nộp hai lần: submitStart khi đang nộp hoặc đã xong bị bỏ qua', () => {
    const submitting = run([{ type: 'submitStart', total: 2 }], allLinked)
    const done = run([{ type: 'submitDone' }], submitting)

    expect(matchingReducer(submitting, { type: 'submitStart', total: 2 })).toBe(submitting)
    expect(matchingReducer(done, { type: 'submitStart', total: 2 })).toBe(done)
  })

  it('submitDone chuyển submitting sang done; ở phase khác thì bỏ qua', () => {
    const submitting = run([{ type: 'submitStart', total: 2 }], allLinked)

    expect(run([{ type: 'submitDone' }], submitting).phase).toBe('done')
    expect(matchingReducer(allLinked, { type: 'submitDone' })).toBe(allLinked)
  })

  it('submitFailed mở khoá lại, giữ nguyên các cặp để trẻ gửi lại', () => {
    const submitting = run([{ type: 'submitStart', total: 2 }], allLinked)
    const state = run([{ type: 'submitFailed' }], submitting)

    expect(state.phase).toBe('pairing')
    expect(state.links).toEqual(allLinked.links)
    expect(canSubmit(state, 2)).toBe(true)
  })

  it('trạng thái xem lại: khởi tạo sẵn các cặp ở phase done thì khoá ngay', () => {
    const review = createMatchingState([link('p1', 'p2')], 'done')

    expect(matchingReducer(review, { type: 'tapLeft', id: 'p1' })).toBe(review)
    expect(review.links).toEqual([link('p1', 'p2')])
  })
})
