import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { CanceledError } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { PendingEditsContext } from '../components/editor/forms/PendingEditsContext'
import { createPendingProbe } from '../test/probes'
import { useCancellableOperation } from './useCancellableOperation'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

function setup(options?: Parameters<typeof useCancellableOperation>[0]) {
  const probe = createPendingProbe()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <PendingEditsContext.Provider value={{ begin: probe.begin, pending: false }}>{children}</PendingEditsContext.Provider>
  )
  const view = renderHook(() => useCancellableOperation(options), { wrapper })

  return { probe, ...view }
}

const describeError = (error: unknown) => (error instanceof Error ? error.message : 'lỗi')

describe('useCancellableOperation', () => {
  it('chạy xong: trả kết quả, về idle, mở khóa', async () => {
    const { result, probe } = setup()
    const task = deferred<string>()
    let outcome!: Promise<string | undefined>

    act(() => {
      outcome = result.current.run(() => task.promise, { describeError })
    })

    expect(result.current.state).toEqual({ status: 'working', progress: null })
    expect(result.current.busy).toBe(true)
    expect(probe.active).toBe(1)

    await act(async () => {
      task.resolve('xong')
      await expect(outcome).resolves.toBe('xong')
    })

    expect(result.current.state).toEqual({ status: 'idle' })
    expect(probe.active).toBe(0)
  })

  it('gọi run lần hai khi lần một chưa xong thì KHÔNG chạy thêm (chốt chặn bấm đúp), chỉ khóa một lần', async () => {
    const { result, probe } = setup()
    const first = deferred<string>()
    const task = vi.fn(() => first.promise)
    let second: Promise<string | undefined> | undefined

    act(() => {
      void result.current.run(task, { describeError })
      second = result.current.run(task, { describeError })
    })

    expect(task).toHaveBeenCalledTimes(1)
    await expect(second).resolves.toBeUndefined()
    expect(probe.begun).toBe(1)

    await act(async () => first.resolve('x'))
  })

  it('báo tiến độ và lỗi; lỗi thì có thông điệp, mở khóa, và cho chạy lại', async () => {
    const { result, probe } = setup()
    const task = deferred<string>()
    let onProgress!: (percent: number) => void

    act(() => {
      void result.current.run(
        (context) => {
          onProgress = context.onProgress

          return task.promise
        },
        { describeError },
      )
    })

    act(() => onProgress(55))
    expect(result.current.state).toEqual({ status: 'working', progress: 55 })

    await act(async () => task.reject(new Error('hỏng')))

    expect(result.current.state).toEqual({ status: 'error', message: 'hỏng' })
    expect(probe.active).toBe(0)

    const retry = deferred<string>()

    act(() => {
      void result.current.run(() => retry.promise, { describeError })
    })
    expect(result.current.state.status).toBe('working')
    await act(async () => retry.resolve('ok'))

    act(() => result.current.clearError())
    expect(result.current.state).toEqual({ status: 'idle' })
  })

  it('lỗi hủy của axios không bị coi là lỗi', async () => {
    const { result } = setup()

    await act(async () => {
      await result.current.run(() => Promise.reject(new CanceledError('canceled')), { describeError })
    })

    expect(result.current.state).toEqual({ status: 'idle' })
  })

  it('hủy: gửi tín hiệu, mở khóa NGAY, bỏ kết quả về muộn và gọi discard với kết quả đó', async () => {
    const { result, probe } = setup()
    const task = deferred<string>()
    const discard = vi.fn()
    let signal!: AbortSignal
    let outcome!: Promise<string | undefined>

    act(() => {
      outcome = result.current.run(
        (context) => {
          signal = context.signal

          return task.promise
        },
        { describeError, discard },
      )
    })
    act(() => result.current.cancel())

    expect(signal.aborted).toBe(true)
    expect(probe.active).toBe(0)
    expect(result.current.state).toEqual({ status: 'idle' })

    await act(async () => task.resolve('muộn'))

    await expect(outcome).resolves.toBeUndefined()
    expect(discard).toHaveBeenCalledWith('muộn')

    // Sau khi hủy có thể chạy việc mới ngay.
    const next = deferred<string>()

    act(() => {
      void result.current.run(() => next.promise, { describeError })
    })
    expect(result.current.state.status).toBe('working')
    await act(async () => next.resolve('ok'))
  })

  it('đóng form giữa chừng: tự hủy, mở khóa, kết quả muộn bị bỏ qua và được discard', async () => {
    const { result, probe, unmount } = setup()
    const task = deferred<string>()
    const discard = vi.fn()
    let signal!: AbortSignal
    let outcome!: Promise<string | undefined>

    act(() => {
      outcome = result.current.run(
        (context) => {
          signal = context.signal

          return task.promise
        },
        { describeError, discard },
      )
    })

    unmount()

    expect(signal.aborted).toBe(true)
    expect(probe.active).toBe(0)

    task.resolve('muộn')
    await expect(outcome).resolves.toBeUndefined()
    expect(discard).toHaveBeenCalledWith('muộn')
  })

  it('lockEditing=false (thao tác chỉ để xem) thì không khóa Lưu/Chơi thử', async () => {
    const { result, probe } = setup({ lockEditing: false })
    const task = deferred<string>()

    act(() => {
      void result.current.run(() => task.promise, { describeError })
    })

    expect(result.current.busy).toBe(true)
    expect(probe.begun).toBe(0)
    await act(async () => task.resolve('x'))
  })
})
