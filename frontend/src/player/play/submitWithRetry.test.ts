import { AxiosError } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockApiError } from '../../services/mock/mockErrors'
import { submitWithRetry } from './submitWithRetry'

const netError = () => new AxiosError('Network Error', 'ERR_NETWORK')

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('submitWithRetry', () => {
  it('lỗi mạng 2 lần rồi thành công: chờ 1s rồi 2s, báo retrying true rồi false', async () => {
    const send = vi.fn().mockRejectedValueOnce(netError()).mockRejectedValueOnce(netError()).mockResolvedValue('ok')
    const onRetrying = vi.fn()
    const promise = submitWithRetry(send, { onRetrying })

    await vi.advanceTimersByTimeAsync(0)
    expect(send).toHaveBeenCalledTimes(1)
    expect(onRetrying).toHaveBeenCalledExactlyOnceWith(true)

    await vi.advanceTimersByTimeAsync(999)
    expect(send).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(send).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(2000)
    await expect(promise).resolves.toBe('ok')
    expect(send).toHaveBeenCalledTimes(3)
    expect(onRetrying.mock.calls).toEqual([[true], [false]])
  })

  it('sự kiện online rút ngắn thời gian chờ', async () => {
    const send = vi.fn().mockRejectedValueOnce(netError()).mockResolvedValue('ok')
    const promise = submitWithRetry(send)

    await vi.advanceTimersByTimeAsync(100)
    expect(send).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new Event('online'))

    await expect(promise).resolves.toBe('ok')
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('chờ tăng dần 1s, 2s, 4s rồi giữ 5s', async () => {
    const send = vi.fn().mockRejectedValue(netError())
    void submitWithRetry(send).catch(() => undefined)

    for (const wait of [1000, 2000, 4000, 5000, 5000]) {
      const before = send.mock.calls.length

      await vi.advanceTimersByTimeAsync(wait - 1)
      expect(send).toHaveBeenCalledTimes(before)
      await vi.advanceTimersByTimeAsync(1)
      expect(send).toHaveBeenCalledTimes(before + 1)
    }
  })

  it('lỗi có phản hồi (400) ném ngay, không thử lại', async () => {
    const error = mockApiError(400, 'VALIDATION_ERROR', 'x')
    const send = vi.fn().mockRejectedValue(error)
    const onRetrying = vi.fn()

    await expect(submitWithRetry(send, { onRetrying })).rejects.toBe(error)
    expect(send).toHaveBeenCalledTimes(1)
    expect(onRetrying).not.toHaveBeenCalled()
  })

  it('abort khi đang chờ: reject lỗi hủy, không còn timer và listener', async () => {
    const removeListener = vi.spyOn(window, 'removeEventListener')
    const send = vi.fn().mockRejectedValue(netError())
    const onRetrying = vi.fn()
    const controller = new AbortController()
    const promise = submitWithRetry(send, { signal: controller.signal, onRetrying })
    const settled = expect(promise).rejects.toMatchObject({ code: 'ERR_CANCELED' })

    await vi.advanceTimersByTimeAsync(10)
    expect(vi.getTimerCount()).toBe(1)

    controller.abort()
    await settled

    expect(vi.getTimerCount()).toBe(0)
    expect(removeListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(onRetrying).toHaveBeenLastCalledWith(false)

    await vi.advanceTimersByTimeAsync(10_000)
    expect(send).toHaveBeenCalledTimes(1)
    removeListener.mockRestore()
  })
})
