import { beforeEach, describe, expect, it, vi } from 'vitest'
import axiosInstance from './axiosInstance'
import { MEDIA_UPLOAD_TIMEOUT_MS, postMedia } from './mediaApi'
import { pngFile } from '../test/mediaFiles'

vi.mock('./axiosInstance', () => ({ default: { post: vi.fn() } }))

const mockedPost = vi.mocked(axiosInstance.post)

beforeEach(() => {
  vi.clearAllMocks()
  mockedPost.mockResolvedValue({ data: { success: true, data: { mediaUrl: 'https://cdn.example/a.png', mediaType: 'IMAGE' } } })
})

describe('postMedia', () => {
  it('gửi multipart tới /media/upload với một phần tên "file", timeout riêng dài hơn và tín hiệu hủy', async () => {
    const file = pngFile('meo.png')
    const controller = new AbortController()
    const result = await postMedia(file, { signal: controller.signal })

    expect(result).toEqual({ mediaUrl: 'https://cdn.example/a.png', mediaType: 'IMAGE' })

    const [url, body, config] = mockedPost.mock.calls[0]

    expect(url).toBe('/media/upload')
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('file')).toBeInstanceOf(File)
    expect(((body as FormData).get('file') as File).name).toBe('meo.png')
    expect(MEDIA_UPLOAD_TIMEOUT_MS).toBeGreaterThan(15_000)
    expect(config).toMatchObject({ timeout: MEDIA_UPLOAD_TIMEOUT_MS, signal: controller.signal })
  })

  it('đổi sự kiện tiến trình của axios thành phần trăm 0 đến 100 (không vượt 100, bỏ qua khi không biết tổng)', async () => {
    const percents: number[] = []

    await postMedia(pngFile(), { onProgress: (percent) => percents.push(percent) })

    const onUploadProgress = (mockedPost.mock.calls[0][2] as { onUploadProgress: (event: { loaded: number; total?: number }) => void }).onUploadProgress

    onUploadProgress({ loaded: 25, total: 100 })
    onUploadProgress({ loaded: 1, total: 3 })
    onUploadProgress({ loaded: 150, total: 100 })
    onUploadProgress({ loaded: 50 })

    expect(percents).toEqual([25, 33, 100])
  })
})
