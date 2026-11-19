import { postMedia } from '../api/mediaApi'
import type { UploadedMedia, UploadOptions } from '../api/mediaApi'
import axiosInstance from '../api/axiosInstance'
import { isMock } from '../config/mockMode'
import type { MediaKind } from '../utils/mediaFile'
import { mockSuggestImages, mockSynthesizeSpeech, mockUploadMedia } from './mock/mockMedia'
import type { ImageSuggestion, SynthesizedSpeech, VoiceGender } from './mock/mockMedia'

export type { ImageSuggestion, SynthesizedSpeech, VoiceGender }

export interface PexelsImage {
  id: number
  url: string
  thumbnailUrl: string
  alt?: string
  photographer?: string
}

/** Tìm kiếm ảnh Pexels qua backend proxy bảo vệ API key */
export async function searchPexelsImages(query: string, perPage = 12, signal?: AbortSignal): Promise<PexelsImage[]> {
  const trimmed = query.trim()
  if (!trimmed) return []
  const res = await axiosInstance.get<{ success: boolean; data: { images: PexelsImage[] } }>('/media/pexels-search', {
    params: { query: trimmed, perPage },
    signal,
  })
  return res.data?.data?.images ?? []
}

/** Tải ảnh hoặc âm thanh của giáo viên lên (UC-05 1a). Nhóm `media` đang mô phỏng thì dùng dịch vụ giả lập; ngược lại gọi POST /media/upload. */
export function uploadMedia(file: File, kind: MediaKind, options: UploadOptions = {}): Promise<UploadedMedia> {
  return isMock('media') ? mockUploadMedia(file, kind, options) : postMedia(file, options)
}

/**
 * Gợi ý ảnh (FLD-11) và tạo giọng đọc (FLD-12) CHƯA có điểm cuối thật trong openapi.yaml, nên chỉ có khi nhóm `media` đang mô phỏng.
 * Giao diện dùng hàm này để ẩn hẳn hai công cụ đó khi chạy với backend thật, thay vì hiện nút không hoạt động.
 */
export const mediaToolsAvailable = () => isMock('media')

export const suggestImages = (query: string, signal?: AbortSignal): Promise<ImageSuggestion[]> => mockSuggestImages(query, signal)

export const synthesizeSpeech = (text: string, voice: VoiceGender, signal?: AbortSignal): Promise<SynthesizedSpeech> =>
  mockSynthesizeSpeech(text, voice, signal)
