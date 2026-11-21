import axios, { AxiosError } from 'axios'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { storeSession } from '../utils/authStorage'
import { logoutTeacher } from './authApi'
import axiosInstance from './axiosInstance'

// Adapter giả: request đầu tiên tới API được bảo vệ trả 401 (access token hết hạn), các lần sau trả 200.
const seenAuthHeaders: Array<string | undefined> = []
const fakeAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  seenAuthHeaders.push(config.headers.Authorization as string | undefined)
  if (seenAuthHeaders.length === 1) {
    throw new AxiosError('expired', '401', config, null, {
      status: 401, statusText: 'Unauthorized', data: {}, headers: {}, config,
    })
  }
  return { status: 200, statusText: 'OK', data: { ok: true }, headers: {}, config }
}

const originalAdapter = axiosInstance.defaults.adapter

beforeEach(() => {
  seenAuthHeaders.length = 0
  axiosInstance.defaults.adapter = fakeAdapter
  vi.stubGlobal('location', { pathname: '/dashboard', assign: vi.fn() })
  storeSession({ teacherId: 't1', email: 'lan@truong.edu.vn' }, 'old-access')
})

afterEach(() => {
  axiosInstance.defaults.adapter = originalAdapter
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('làm mới access token bằng cookie refresh_token', () => {
  it('bật withCredentials để trình duyệt nhận và gửi cookie refresh_token khác origin', () => {
    expect(axiosInstance.defaults.withCredentials).toBe(true)
  })

  it('401 thì gọi /auth/refresh không body, kèm cookie, rồi gửi lại request bằng access token mới', async () => {
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: { data: { accessToken: 'new-access' } } })

    const response = await axiosInstance.get('/games')

    expect(response.data).toEqual({ ok: true })
    expect(refresh).toHaveBeenCalledTimes(1)
    const [url, body, config] = refresh.mock.calls[0]
    expect(url).toMatch(/\/auth\/refresh$/)
    expect(body).toBeUndefined()
    expect(config).toEqual({ withCredentials: true })
    expect(seenAuthHeaders).toEqual(['Bearer old-access', 'Bearer new-access'])
    expect(localStorage.getItem('accessToken')).toBe('new-access')
    // Khóa refreshToken của contract cũ không được ghi lại.
    expect(localStorage.getItem('refreshToken')).toBeNull()
  })

  it('cookie hết hạn/bị thu hồi (refresh trả 401) thì xóa phiên và về trang đăng nhập', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(
      new AxiosError('invalid', '401', undefined, null, {
        status: 401, statusText: 'Unauthorized', data: {}, headers: {}, config: {} as InternalAxiosRequestConfig,
      }),
    )

    await expect(axiosInstance.get('/games')).rejects.toBeInstanceOf(AxiosError)

    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(window.location.assign).toHaveBeenCalledWith('/login')
  })
})

describe('đăng xuất trong lúc đang làm mới token', () => {
  it('refresh trả về sau khi đã đăng xuất thì không ghi lại access token vào máy và không gửi lại request', async () => {
    vi.spyOn(axios, 'post').mockImplementation(async () => {
      // Giáo viên bấm Đăng xuất (phiên ở máy bị xóa) trong lúc refresh còn chờ.
      localStorage.clear()
      return { data: { data: { accessToken: 'late-access' } } }
    })

    await expect(axiosInstance.get('/games')).rejects.toThrow('Session ended while refreshing')

    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(seenAuthHeaders).toEqual(['Bearer old-access'])
  })
})

describe('logoutTeacher', () => {
  it('gửi POST /auth/logout qua axiosInstance kèm Bearer và cookie (withCredentials)', async () => {
    const calls: InternalAxiosRequestConfig[] = []
    axiosInstance.defaults.adapter = async (config) => {
      calls.push(config)
      return { status: 204, statusText: 'No Content', data: '', headers: {}, config }
    }

    await logoutTeacher()

    expect(calls).toHaveLength(1)
    expect(calls[0].method).toBe('post')
    expect(calls[0].url).toBe('/auth/logout')
    expect(calls[0].headers.Authorization).toBe('Bearer old-access')
    expect(calls[0].withCredentials).toBe(true)
  })
})
