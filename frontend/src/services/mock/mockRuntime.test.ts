import { AxiosError } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseApiError } from '../../utils/apiError'
import { getMockScenario, installMockDevTools, mockDelay, runMock, setMockScenario } from './mockRuntime'

afterEach(() => {
  setMockScenario('normal')
  vi.useRealTimers()
})

describe('runMock', () => {
  it('kịch bản bình thường: trả dữ liệu do service tạo ra', async () => {
    await expect(runMock(() => [1, 2, 3])).resolves.toEqual([1, 2, 3])
  })

  it('kịch bản trống: service nhận được "empty" để tự trả dữ liệu trống', async () => {
    setMockScenario('empty')

    await expect(runMock((scenario) => (scenario === 'empty' ? [] : [1]))).resolves.toEqual([])
  })

  it('kịch bản lỗi: ném lỗi mất kết nối giống axios, parseApiError ra câu "kiểm tra mạng"', async () => {
    setMockScenario('error')
    const produce = vi.fn()

    const error = await runMock(produce).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(AxiosError)
    expect((error as AxiosError).code).toBe('ERR_NETWORK')
    expect(parseApiError(error, 'dự phòng').message).toMatch(/kiểm tra mạng/)
    expect(produce).not.toHaveBeenCalled()
  })

  it('kịch bản quá thời gian: ném lỗi ECONNABORTED giống axios, parseApiError ra câu "phản hồi quá chậm"', async () => {
    setMockScenario('timeout')

    const error = await runMock(vi.fn()).catch((caught: unknown) => caught)

    expect((error as AxiosError).code).toBe('ECONNABORTED')
    expect(parseApiError(error, 'dự phòng').message).toMatch(/quá chậm/)
  })

  it('đổi kịch bản được và đọc lại được', () => {
    setMockScenario('slow')

    expect(getMockScenario()).toBe('slow')
  })
})

describe('installMockDevTools (chỉ môi trường phát triển)', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/')
    delete window.__mock
  })

  it('đọc kịch bản từ ?mock= trên địa chỉ và gắn window.__mock', () => {
    window.history.pushState({}, '', '/workspace?mock=empty')

    installMockDevTools()

    expect(getMockScenario()).toBe('empty')
    window.__mock?.setScenario('error')
    expect(window.__mock?.getScenario()).toBe('error')
  })

  it('bản build (không phải môi trường phát triển): không gắn window.__mock và bỏ qua ?mock=', () => {
    vi.stubEnv('DEV', false)
    window.history.pushState({}, '', '/workspace?mock=error')

    installMockDevTools()

    expect(window.__mock).toBeUndefined()
    expect(getMockScenario()).toBe('normal')
    vi.stubEnv('DEV', true)
  })

  it('đọc được cả ?mock=timeout', () => {
    window.history.pushState({}, '', '/workspace?mock=timeout')

    installMockDevTools()

    expect(getMockScenario()).toBe('timeout')
  })

  it('giá trị ?mock= lạ bị bỏ qua, giữ kịch bản hiện tại', () => {
    window.history.pushState({}, '', '/workspace?mock=lung-tung')

    installMockDevTools()

    expect(getMockScenario()).toBe('normal')
  })
})

describe('độ trễ mặc định theo VITE_MOCK_LATENCY_MS', () => {
  afterEach(() => vi.stubEnv('VITE_MOCK_LATENCY_MS', '0'))

  const waited = async (value: string) => {
    vi.useFakeTimers()
    vi.stubEnv('VITE_MOCK_LATENCY_MS', value)
    let done = false
    const promise = mockDelay().then(() => {
      done = true
    })

    await vi.advanceTimersByTimeAsync(399)
    const doneBefore400 = done
    await vi.advanceTimersByTimeAsync(1)
    await promise

    return doneBefore400
  }

  it('chuỗi rỗng, chữ hay số âm thì dùng mặc định 400 ms (không coi rỗng là 0)', async () => {
    expect(await waited('')).toBe(false)
    expect(await waited('abc')).toBe(false)
    expect(await waited('-5')).toBe(false)
  })

  it('số hợp lệ thì dùng đúng số đó (0 là không chờ)', async () => {
    expect(await waited('0')).toBe(true)
    expect(await waited('25')).toBe(true)
  })
})

describe('mockDelay', () => {
  it('độ trễ mặc định theo VITE_MOCK_LATENCY_MS (test đặt 0), kịch bản chậm kéo dài tối thiểu 3 giây', async () => {
    vi.useFakeTimers()
    let done = false
    setMockScenario('slow')
    const promise = mockDelay(0).then(() => {
      done = true
    })

    await vi.advanceTimersByTimeAsync(2999)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await promise
    expect(done).toBe(true)
  })

  it('không có kịch bản chậm thì chờ đúng số mili giây được truyền', async () => {
    vi.useFakeTimers()
    let done = false
    const promise = mockDelay(250).then(() => {
      done = true
    })

    await vi.advanceTimersByTimeAsync(249)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await promise
    expect(done).toBe(true)
  })
})
