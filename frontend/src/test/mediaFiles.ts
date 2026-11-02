import { vi } from 'vitest'

// Công cụ test cho phần tải ảnh/âm thanh: tệp giả có đúng byte đầu của từng định dạng, và bộ giả `URL.createObjectURL` (jsdom không có)
// theo dõi đường dẫn nào đã được cấp, đường dẫn nào đã được giải phóng.

const ascii = (text: string) => Array.from(text, (char) => char.charCodeAt(0))

export const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52]
export const JPEG_BYTES = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]
export const WEBP_BYTES = [...ascii('RIFF'), 0x24, 0, 0, 0, ...ascii('WEBP'), ...ascii('VP8 ')]
export const MP3_BYTES = [...ascii('ID3'), 3, 0, 0, 0, 0, 0, 0x21, 0xff, 0xfb, 0x90, 0x64]

export const makeFile = (bytes: number[] | string, name: string, type = '') => new File([typeof bytes === 'string' ? bytes : new Uint8Array(bytes)], name, { type })

export const pngFile = (name = 'meo.png') => makeFile(PNG_BYTES, name, 'image/png')
export const mp3File = (name = 'loi-doc.mp3') => makeFile(MP3_BYTES, name, 'audio/mpeg')

export interface BlobUrlTracker {
  created: string[]
  revoked: string[]
  restore: () => void
}

/** Thay `URL.createObjectURL` và `revokeObjectURL` bằng bản giả; gọi `restore()` khi xong. */
export function trackBlobUrls(): BlobUrlTracker {
  const created: string[] = []
  const revoked: string[] = []
  const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL }

  URL.createObjectURL = vi.fn(() => {
    const url = `blob:http://localhost/test-${created.length + 1}`

    created.push(url)

    return url
  })
  URL.revokeObjectURL = vi.fn((url: string) => {
    revoked.push(url)
  })

  return {
    created,
    revoked,
    restore: () => {
      URL.createObjectURL = original.create
      URL.revokeObjectURL = original.revoke
    },
  }
}
