import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reviseGame } from '../services/reviseService'
import type { AnyGameResponse } from '../types/game-response.types'
import { useReviseChat } from './useReviseChat'

vi.mock('../services/reviseService', () => ({ reviseGame: vi.fn() }))

const mocked = vi.mocked(reviseGame)
const REVISED = { gameId: 'g1', gameType: 'QUIZ' } as unknown as AnyGameResponse

beforeEach(() => {
  mocked.mockReset()
})

describe('useReviseChat', () => {
  it('trình soạn trả câu nhắn riêng (ví dụ chưa áp vì đã sửa tay) thì khung chat hiện câu đó', async () => {
    mocked.mockResolvedValue(REVISED)
    const onSending = vi.fn()
    const { result } = renderHook(() => useReviseChat('g1', () => 'Chưa áp', onSending))

    act(() => {
      result.current.send('dễ hơn')
    })
    await waitFor(() => expect(result.current.messages.at(-1)).toEqual({ role: 'ASSISTANT', text: 'Chưa áp' }))
    expect(onSending).toHaveBeenCalledTimes(1)
  })

  it('gửi yêu cầu kèm các lượt trước, giao game đã sửa cho trình soạn', async () => {
    mocked.mockResolvedValue(REVISED)
    const onRevised = vi.fn()
    const { result } = renderHook(() => useReviseChat('g1', onRevised))

    act(() => {
      result.current.send('dễ hơn')
    })
    await waitFor(() => expect(onRevised).toHaveBeenCalledWith(REVISED))
    act(() => {
      result.current.send('  thêm 2 câu ')
    })
    await waitFor(() => expect(mocked).toHaveBeenCalledTimes(2))

    expect(mocked.mock.calls[0]).toEqual(['g1', { instruction: 'dễ hơn', history: [] }])
    expect(mocked.mock.calls[1][1]).toEqual({
      instruction: 'thêm 2 câu',
      history: [
        { role: 'TEACHER', text: 'dễ hơn' },
        { role: 'ASSISTANT', text: expect.any(String) },
      ],
    })
  })

  it('đang chờ trợ lý thì không gửi thêm được, kể cả bấm liền hai lần', () => {
    mocked.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useReviseChat('g1', vi.fn()))

    let second = true
    act(() => {
      result.current.send('dễ hơn')
      second = result.current.send('khó hơn')
    })

    expect(second).toBe(false)
    expect(mocked).toHaveBeenCalledTimes(1)
  })

  it('lỗi thì báo, Thử lại gửi lại đúng yêu cầu đó mà không thêm tin mới', async () => {
    mocked.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce(REVISED)
    const onRevised = vi.fn()
    const { result } = renderHook(() => useReviseChat('g1', onRevised))

    act(() => {
      result.current.send('dễ hơn')
    })
    await waitFor(() => expect(result.current.error).not.toBeNull())
    act(() => {
      result.current.retry()
    })
    await waitFor(() => expect(onRevised).toHaveBeenCalled())

    expect(mocked.mock.calls[1][1]).toEqual({ instruction: 'dễ hơn', history: [] })
    expect(result.current.messages.filter((m) => m.role === 'TEACHER')).toHaveLength(1)
  })
})
