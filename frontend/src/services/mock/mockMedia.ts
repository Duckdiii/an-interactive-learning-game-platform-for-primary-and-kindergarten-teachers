import type { UploadedMedia, UploadOptions } from '../../api/mediaApi'
import type { MediaKind } from '../../utils/mediaFile'
import { mockApiError } from './mockErrors'
import { mockNetworkError, mockTimeoutError, mockTotalDelayMs, mockWait, getMockScenario } from './mockRuntime'

// Dịch vụ giả lập cho nhóm `media` (cờ VITE_USE_MOCK): tải tệp, gợi ý ảnh, tạo giọng đọc. Backend chưa có các điểm cuối này nên mọi kết quả
// ở đây là DỮ LIỆU MÔ PHỎNG (giao diện luôn gắn nhãn). Không có gì được gửi đi đâu cả: tệp chỉ nằm trong bộ nhớ của tab.

// Số bước tiến trình giả lập của một lần tải; tải tệp lâu hơn lời gọi thường nên tổng thời gian gấp vài lần độ trễ chung.
const UPLOAD_STEPS = 5
const UPLOAD_DURATION_FACTOR = 4

/**
 * Rà an toàn giả lập: tên tệp có chứa các từ này thì coi là nội dung không an toàn (UC-05 3b) để thử đường lỗi. Backend thật phải rà nội
 * dung ảnh/âm thanh bằng dịch vụ kiểm duyệt (xem docs/decisions.md).
 */
export const MOCK_UNSAFE_FILENAME = /unsafe|khong-an-toan|nsfw/i

export const unsafeContentError = () =>
  mockApiError(422, 'UNSAFE_CONTENT', 'Tệp tải lên không đáp ứng tiêu chuẩn an toàn nội dung dành cho môi trường giáo dục.')

export async function mockUploadMedia(file: File, kind: MediaKind, options: UploadOptions = {}): Promise<UploadedMedia> {
  const stepMs = (mockTotalDelayMs() * UPLOAD_DURATION_FACTOR) / UPLOAD_STEPS

  for (let step = 1; step <= UPLOAD_STEPS; step += 1) {
    await mockWait(stepMs, options.signal)

    // Lỗi mạng và quá hạn xảy ra GIỮA lần tải (giống thật), không phải ngay từ đầu.
    if (step === 2 && getMockScenario() === 'error') throw mockNetworkError()
    if (step === 2 && getMockScenario() === 'timeout') throw mockTimeoutError()

    options.onProgress?.(Math.round((step / UPLOAD_STEPS) * 100))
  }

  // Giai đoạn rà an toàn nằm sau khi tải xong, như backend thật (tải rồi mới quét).
  await mockWait(stepMs, options.signal)

  if (MOCK_UNSAFE_FILENAME.test(file.name)) throw unsafeContentError()

  return { mediaUrl: URL.createObjectURL(file), mediaType: kind === 'image' ? 'IMAGE' : 'AUDIO' }
}

// ---- Gợi ý ảnh (FLD-11): giả lập kết quả Pexels với bộ lọc SafeSearch ----

export interface ImageSuggestion {
  id: string
  url: string
  // Chú thích ngắn (dùng làm văn bản thay thế của ảnh).
  label: string
  credit: string
}

const CREDIT = 'Pexels (mô phỏng)'
const CATALOG: ReadonlyArray<ImageSuggestion & { keywords: ReadonlyArray<string> }> = [
  { id: 'apple', url: '/mock/apple.png', label: 'Quả táo', credit: CREDIT, keywords: ['tao', 'apple', 'qua', 'trai cay', 'hoa qua'] },
  { id: 'cat', url: '/mock/cat.png', label: 'Con mèo', credit: CREDIT, keywords: ['meo', 'cat', 'con vat', 'dong vat'] },
  { id: 'dog', url: '/mock/dog.png', label: 'Con chó', credit: CREDIT, keywords: ['cho', 'dog', 'con vat', 'dong vat'] },
  { id: 'three-cats', url: '/mock/three-cats.png', label: 'Ba chú mèo', credit: CREDIT, keywords: ['meo', 'cat', 'ba', '3', 'dem'] },
]

const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .toLowerCase()

/** Ảnh mẫu khớp với mô tả `query` (thuần, không độ trễ): khớp từ khóa thì chỉ lấy ảnh khớp, không khớp thì trả bộ ảnh chung. */
export function findMockImages(query: string): ImageSuggestion[] {
  const words = fold(query)
  const matched = CATALOG.filter((item) => item.keywords.some((keyword) => words.includes(keyword)))

  return (matched.length > 0 ? matched : CATALOG).map(({ keywords: _keywords, ...item }) => item)
}

/** Ảnh gợi ý cho mô tả `query` (tối đa 4). Kịch bản `empty` trả danh sách trống. */
export async function mockSuggestImages(query: string, signal?: AbortSignal): Promise<ImageSuggestion[]> {
  await mockWait(mockTotalDelayMs(), signal)

  const scenario = getMockScenario()

  if (scenario === 'error') throw mockNetworkError()
  if (scenario === 'timeout') throw mockTimeoutError()
  if (scenario === 'empty') return []

  return findMockImages(query)
}

// ---- Tạo giọng đọc (FLD-12): giả lập, luôn trả cùng một tệp mẫu ----

export type VoiceGender = 'FEMALE' | 'MALE'

export interface SynthesizedSpeech {
  mediaUrl: string
  voice: VoiceGender
}

/** Giọng đọc mẫu: tệp âm thanh có sẵn, đuôi `?voice=` để biết giọng đã chọn (máy chủ tĩnh bỏ qua phần này). */
export async function mockSynthesizeSpeech(_text: string, voice: VoiceGender, signal?: AbortSignal): Promise<SynthesizedSpeech> {
  await mockWait(mockTotalDelayMs(), signal)

  const scenario = getMockScenario()

  if (scenario === 'error') throw mockNetworkError()
  if (scenario === 'timeout') throw mockTimeoutError()

  return { mediaUrl: `/mock/q1.wav?voice=${voice}`, voice }
}
