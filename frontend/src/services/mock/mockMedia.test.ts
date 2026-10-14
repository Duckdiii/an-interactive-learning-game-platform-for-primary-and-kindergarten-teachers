import axios from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeFile, mp3File, pngFile, trackBlobUrls } from '../../test/mediaFiles'
import type { BlobUrlTracker } from '../../test/mediaFiles'
import { parseApiError } from '../../utils/apiError'
import { uploadErrorMessage } from '../../utils/mediaErrors'
import { MOCK_UNSAFE_FILENAME, mockSuggestImages, mockSynthesizeSpeech, mockUploadMedia } from './mockMedia'
import { setMockScenario } from './mockRuntime'

let urls: BlobUrlTracker

beforeEach(() => {
  urls = trackBlobUrls()
})
afterEach(() => {
  urls.restore()
  vi.stubEnv('VITE_MOCK_LATENCY_MS', '0')
  setMockScenario('normal')
})

describe('mockUploadMedia', () => {
  it('báo tiến trình tăng dần tới 100 rồi trả đường dẫn của tệp (ảnh -> IMAGE, âm thanh -> AUDIO)', async () => {
    const progress: number[] = []
    const image = await mockUploadMedia(pngFile(), 'image', { onProgress: (percent) => progress.push(percent) })

    expect(progress).toEqual([20, 40, 60, 80, 100])
    expect(image).toEqual({ mediaUrl: urls.created[0], mediaType: 'IMAGE' })
    await expect(mockUploadMedia(mp3File(), 'audio')).resolves.toMatchObject({ mediaType: 'AUDIO' })
  })

  it('tên tệp có từ khóa không an toàn thì bị từ chối SAU khi tải xong với mã 422 UNSAFE_CONTENT, và không cấp đường dẫn nào', async () => {
    const progress: number[] = []
    const error = await mockUploadMedia(pngFile('anh-nsfw.png'), 'image', { onProgress: (percent) => progress.push(percent) }).catch((caught: unknown) => caught)

    expect(progress.at(-1)).toBe(100)
    expect(axios.isAxiosError(error) && error.response?.status).toBe(422)
    expect(parseApiError(error, '').code).toBe('UNSAFE_CONTENT')
    expect(urls.created).toHaveLength(0)
    expect(MOCK_UNSAFE_FILENAME.test('Khong-An-Toan.png')).toBe(true)
    expect(MOCK_UNSAFE_FILENAME.test('con-meo.png')).toBe(false)
  })

  it('lỗi mạng và quá hạn xảy ra GIỮA lần tải (đã báo được một phần tiến trình), không có đường dẫn nào được cấp', async () => {
    for (const scenario of ['error', 'timeout'] as const) {
      setMockScenario(scenario)

      const progress: number[] = []
      const error = await mockUploadMedia(pngFile(), 'image', { onProgress: (percent) => progress.push(percent) }).catch((caught: unknown) => caught)

      expect(progress, scenario).toEqual([20])
      expect(uploadErrorMessage(error), scenario).toBe(
        scenario === 'error' ? 'Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại.' : 'Máy chủ phản hồi quá chậm. Hãy thử lại sau ít phút.',
      )
    }

    expect(urls.created).toHaveLength(0)
  })

  it('hủy giữa chừng thì dừng ngay với lỗi hủy của axios và không cấp đường dẫn', async () => {
    vi.stubEnv('VITE_MOCK_LATENCY_MS', '20')

    const controller = new AbortController()
    const progress: number[] = []
    const error = await mockUploadMedia(pngFile(), 'image', {
      signal: controller.signal,
      onProgress: (percent) => {
        progress.push(percent)
        if (percent >= 40) controller.abort()
      },
    }).catch((caught: unknown) => caught)

    expect(axios.isCancel(error)).toBe(true)
    expect(progress).toEqual([20, 40])
    expect(urls.created).toHaveLength(0)
  })

  it('đã hủy từ trước thì không làm gì cả', async () => {
    const controller = new AbortController()

    controller.abort()

    await expect(mockUploadMedia(pngFile(), 'image', { signal: controller.signal })).rejects.toSatisfy((error) => axios.isCancel(error))
  })
})

describe('mockSuggestImages (mô phỏng Pexels SafeSearch)', () => {
  it('chọn ảnh theo từ khóa trong mô tả, không phân biệt dấu và hoa thường', async () => {
    const cats = await mockSuggestImages('Một con MÈO đang ngủ')
    const apple = await mockSuggestImages('quả táo đỏ')

    expect(cats.map((item) => item.id)).toEqual(['cat', 'three-cats'])
    expect(apple.map((item) => item.id)).toEqual(['apple'])
    expect(apple[0]).toMatchObject({ url: '/mock/apple.png', label: 'Quả táo', credit: 'Pexels (mô phỏng)' })
  })

  it('mô tả không khớp từ khóa thì trả bộ ảnh chung; kịch bản empty trả danh sách trống', async () => {
    expect(await mockSuggestImages('một thứ gì đó')).toHaveLength(4)

    setMockScenario('empty')

    expect(await mockSuggestImages('con mèo')).toEqual([])
  })

  it('lỗi mạng và quá hạn ném lỗi giống axios', async () => {
    setMockScenario('error')
    await expect(mockSuggestImages('mèo')).rejects.toMatchObject({ code: 'ERR_NETWORK' })
    setMockScenario('timeout')
    await expect(mockSuggestImages('mèo')).rejects.toMatchObject({ code: 'ECONNABORTED' })
  })
})

describe('mockSynthesizeSpeech', () => {
  it('trả tệp giọng đọc mẫu kèm giọng đã chọn', async () => {
    await expect(mockSynthesizeSpeech('Xin chào', 'MALE')).resolves.toEqual({ mediaUrl: '/mock/q1.wav?voice=MALE', voice: 'MALE' })
    await expect(mockSynthesizeSpeech('Xin chào', 'FEMALE')).resolves.toMatchObject({ mediaUrl: '/mock/q1.wav?voice=FEMALE' })
  })

  it('lỗi mạng thì ném lỗi, hủy thì dừng', async () => {
    setMockScenario('error')
    await expect(mockSynthesizeSpeech('x', 'FEMALE')).rejects.toMatchObject({ code: 'ERR_NETWORK' })

    setMockScenario('normal')

    const controller = new AbortController()

    controller.abort()
    await expect(mockSynthesizeSpeech('x', 'FEMALE', controller.signal)).rejects.toSatisfy((error) => axios.isCancel(error))
  })
})

describe('tên tệp thường', () => {
  it('tệp tên bình thường không bị coi là không an toàn', async () => {
    await expect(mockUploadMedia(makeFile([0x89], 'qua-tao.png'), 'image')).resolves.toMatchObject({ mediaType: 'IMAGE' })
  })
})
