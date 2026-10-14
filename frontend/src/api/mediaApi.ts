import axiosInstance from './axiosInstance'
import type { ApiSuccessResponse } from '../types/api'

// Tải tệp lớn (tới 10MB) trên mạng yếu mất lâu hơn các lệnh khác nên cho dài hơn; giáo viên vẫn hủy được bất cứ lúc nào.
export const MEDIA_UPLOAD_TIMEOUT_MS = 60_000

export interface UploadedMedia {
  mediaUrl: string
  mediaType: 'IMAGE' | 'AUDIO'
}

export interface UploadOptions {
  signal?: AbortSignal
  // Phần trăm đã tải (0 đến 100).
  onProgress?: (percent: number) => void
}

/** POST /media/upload (multipart): tải ảnh hoặc âm thanh riêng của giáo viên; trả đường dẫn để gắn vào `imageUrl`/`audioUrl`. */
export async function postMedia(file: File, options: UploadOptions = {}) {
  const body = new FormData()

  body.append('file', file)

  const response = await axiosInstance.post<ApiSuccessResponse<UploadedMedia>>('/media/upload', body, {
    timeout: MEDIA_UPLOAD_TIMEOUT_MS,
    signal: options.signal,
    onUploadProgress: (event) => {
      if (event.total) options.onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)))
    },
  })

  return response.data.data
}
