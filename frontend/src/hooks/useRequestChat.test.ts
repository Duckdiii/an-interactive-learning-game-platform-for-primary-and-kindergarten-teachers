import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { understandGame } from '../services/understandingService'
import type { GameUnderstandingResponse } from '../types/understanding.types'
import { useRequestChat } from './useRequestChat'

vi.mock('../services/understandingService', () => ({ understandGame: vi.fn() }))

const mocked = vi.mocked(understandGame)
const LESSON = { subject: 'MATH', gradeLevel: 'GRADE_1' }
const RESULT: GameUnderstandingResponse = {
  reply: 'Ok',
  question: null,
  understanding: {
    learningGoal: 'Đếm', childAction: 'Chọn', content: [], setting: '', gameType: 'QUIZ',
    alternativeGameTypes: [], unsupported: [], assumptions: [],
  },
  ready: true,
}

// Lời gọi chưa trả về, để kiểm tra trạng thái "đang chờ".
function deferred() {
  let resolve!: (value: GameUnderstandingResponse) => void
  const promise = new Promise<GameUnderstandingResponse>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

beforeEach(() => {
  mocked.mockReset()
})

describe('useRequestChat', () => {
  it('đang chờ trợ lý thì không gửi thêm được (kể cả bấm liền hai lần trước khi vẽ lại)', async () => {
    const first = deferred()
    mocked.mockReturnValueOnce(first.promise)
    const { result } = renderHook(() => useRequestChat(LESSON))

    let second = true
    act(() => {
      result.current.send('Một')
      second = result.current.send('Hai')
    })

    expect(second).toBe(false)
    expect(mocked).toHaveBeenCalledTimes(1)
    await act(async () => first.resolve(RESULT))
    expect(result.current.messages).toEqual([
      { role: 'TEACHER', text: 'Một' },
      { role: 'ASSISTANT', text: 'Ok' },
    ])
  })

  it('reset() rồi send() ngay: cuộc mới không mang lịch sử cũ; kết quả của lượt cũ về muộn bị bỏ qua', async () => {
    const stale = deferred()
    mocked.mockReturnValueOnce(stale.promise).mockResolvedValueOnce(RESULT)
    const { result } = renderHook(() => useRequestChat(LESSON))

    act(() => {
      result.current.send('Cũ')
    })
    act(() => {
      result.current.reset()
      result.current.send('Mới')
    })
    await act(async () => stale.resolve({ ...RESULT, reply: 'Trả lời cũ' }))

    expect(mocked.mock.calls[1][0].messages).toEqual([{ role: 'TEACHER', text: 'Mới' }])
    await waitFor(() => expect(result.current.messages.at(-1)).toEqual({ role: 'ASSISTANT', text: 'Ok' }))
    expect(result.current.messages.map((turn) => turn.text)).not.toContain('Trả lời cũ')
  })

  it('đủ 12 tin thì không gửi thêm (canSend false), đúng giới hạn của openapi', async () => {
    mocked.mockResolvedValue(RESULT)
    const { result } = renderHook(() => useRequestChat(LESSON))

    for (let turn = 0; turn < 6; turn += 1) {
      act(() => {
        result.current.send(`Tin ${turn}`)
      })
      await waitFor(() => expect(result.current.pending).toBe(false))
    }

    expect(result.current.messages).toHaveLength(12)
    expect(result.current.canSend).toBe(false)
    let sent = true
    act(() => {
      sent = result.current.send('Thêm')
    })
    expect(sent).toBe(false)
    expect(mocked).toHaveBeenCalledTimes(6)
  })
})
