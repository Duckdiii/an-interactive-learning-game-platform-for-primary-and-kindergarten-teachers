import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { clearNewGames, isNewGame, markNewGames, unmarkNewGame, useNewGameIds } from './newGames'

afterEach(() => clearNewGames())

describe('newGames', () => {
  it('đánh dấu nhiều game; mở một game thì chỉ game đó hết "Mới"', () => {
    markNewGames(['g1', 'g2', 'g3'])

    expect(['g1', 'g2', 'g3'].every(isNewGame)).toBe(true)

    unmarkNewGame('g2')

    expect([isNewGame('g1'), isNewGame('g2'), isNewGame('g3')]).toEqual([true, false, true])
  })

  it('đăng xuất hoặc đổi người: xóa sạch', () => {
    markNewGames(['g1', 'g2'])
    clearNewGames()

    expect(isNewGame('g1')).toBe(false)
    expect(isNewGame('g2')).toBe(false)
  })

  it('không lưu vào localStorage hay sessionStorage (tải lại trang là hết)', () => {
    localStorage.clear()
    sessionStorage.clear()
    markNewGames(['g1'])

    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })

  it('hook vẽ lại khi tập đổi, và KHÔNG vẽ lại khi gỡ một mã không có trong tập hay xóa tập đã rỗng', () => {
    let renders = 0
    const { result } = renderHook(() => {
      renders += 1

      return useNewGameIds()
    })

    expect(result.current.has('g1')).toBe(false)

    act(() => markNewGames(['g1']))
    expect(result.current.has('g1')).toBe(true)

    const before = renders

    act(() => {
      unmarkNewGame('khong-co')
      markNewGames([])
    })
    expect(renders).toBe(before)

    act(() => unmarkNewGame('g1'))
    expect(result.current.has('g1')).toBe(false)

    const afterUnmark = renders

    act(() => clearNewGames())
    expect(renders).toBe(afterUnmark)
  })
})
