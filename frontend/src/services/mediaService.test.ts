import { afterEach, describe, expect, it, vi } from 'vitest'
import { postMedia } from '../api/mediaApi'
import { pngFile, trackBlobUrls } from '../test/mediaFiles'
import { mediaToolsAvailable, uploadMedia } from './mediaService'

vi.mock('../api/mediaApi', () => ({ postMedia: vi.fn() }))

const mockedPost = vi.mocked(postMedia)

afterEach(() => {
  vi.stubEnv('VITE_USE_MOCK', 'none')
  vi.clearAllMocks()
})

describe('uploadMedia', () => {
  it('nhóm media KHÔNG mô phỏng thì gọi API thật và truyền nguyên tùy chọn (tín hiệu hủy, tiến trình)', async () => {
    mockedPost.mockResolvedValue({ mediaUrl: 'https://cdn.example/a.png', mediaType: 'IMAGE' })

    const options = { signal: new AbortController().signal, onProgress: vi.fn() }
    const file = pngFile()

    await expect(uploadMedia(file, 'image', options)).resolves.toEqual({ mediaUrl: 'https://cdn.example/a.png', mediaType: 'IMAGE' })
    expect(mockedPost).toHaveBeenCalledWith(file, options)
  })

  it('nhóm media đang mô phỏng thì dùng dịch vụ giả lập, không gọi API', async () => {
    vi.stubEnv('VITE_USE_MOCK', 'media')

    const urls = trackBlobUrls()

    try {
      await expect(uploadMedia(pngFile(), 'image')).resolves.toMatchObject({ mediaType: 'IMAGE' })
      expect(mockedPost).not.toHaveBeenCalled()
    } finally {
      urls.restore()
    }
  })
})

describe('mediaToolsAvailable', () => {
  it('gợi ý ảnh và tạo giọng đọc chỉ có khi nhóm media đang mô phỏng (backend chưa có điểm cuối)', () => {
    expect(mediaToolsAvailable()).toBe(false)

    vi.stubEnv('VITE_USE_MOCK', 'media')
    expect(mediaToolsAvailable()).toBe(true)

    vi.stubEnv('VITE_USE_MOCK', 'games,editor')
    expect(mediaToolsAvailable()).toBe(false)
  })
})
