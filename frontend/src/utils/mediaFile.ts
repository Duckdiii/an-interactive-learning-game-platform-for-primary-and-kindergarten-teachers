// Kiểm tra tệp ảnh/âm thanh giáo viên tải lên (UC-05 luồng 1a, 3a). Loại tệp xác định bằng MAGIC BYTES (vài byte đầu của tệp), KHÔNG tin đuôi
// tệp hay loại MIME do trình duyệt khai báo (đổi tên .exe thành .png không qua được). SVG bị cấm hẳn: là văn bản có thể chứa mã chạy được.
// Backend vẫn là chốt chặn thật (kiểm tra lại và rà an toàn nội dung); đây chỉ để từ chối sớm, đỡ tải tệp sai lên.

export type MediaKind = 'image' | 'audio'

export const MEDIA_LIMITS: Readonly<Record<MediaKind, { maxBytes: number }>> = {
  image: { maxBytes: 5 * 1024 * 1024 },
  audio: { maxBytes: 10 * 1024 * 1024 },
}

export type MediaFormat = 'png' | 'jpeg' | 'webp' | 'mp3'

const FORMAT_KIND: Readonly<Record<MediaFormat, MediaKind>> = { png: 'image', jpeg: 'image', webp: 'image', mp3: 'audio' }

export const FORMAT_MIME: Readonly<Record<MediaFormat, string>> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
}

// Số byte đầu cần đọc để nhận diện mọi định dạng trên (WebP cần 12).
const HEAD_BYTES = 16

const startsWith = (bytes: Uint8Array, signature: ReadonlyArray<number>, offset = 0) =>
  signature.every((value, index) => bytes[offset + index] === value)

const ascii = (bytes: Uint8Array, offset: number, length: number) =>
  String.fromCharCode(...Array.from(bytes.slice(offset, offset + length)))

/** Định dạng thật của tệp theo vài byte đầu, hoặc null khi không phải PNG, JPG, WebP hay MP3. */
export function detectFormat(bytes: Uint8Array): MediaFormat | null {
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'jpeg'
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return 'webp'
  // MP3: có thẻ ID3 ở đầu, hoặc bắt đầu thẳng bằng khung MPEG-1/2/2.5 Layer III (11 bit đồng bộ, phiên bản hợp lệ, Layer III).
  if (ascii(bytes, 0, 3) === 'ID3') return 'mp3'
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0 && ((bytes[1] >> 3) & 0x03) !== 0x01 && ((bytes[1] >> 1) & 0x03) === 0x01) return 'mp3'

  return null
}

/** SVG (hoặc XML) nhìn từ nội dung: bỏ BOM và khoảng trắng đầu rồi xem có bắt đầu bằng thẻ SVG/XML không. */
export function looksLikeSvg(bytes: Uint8Array) {
  const text = new TextDecoder('utf-8').decode(bytes).replace(/^﻿/, '').trimStart().toLowerCase()

  return text.startsWith('<svg') || text.startsWith('<?xml') || text.startsWith('<!doctype svg')
}

const declaresSvg = (file: Pick<File, 'name' | 'type'>) => /\.svgz?$/i.test(file.name) || file.type.toLowerCase().includes('svg')

export type MediaCheck =
  | { ok: true; format: MediaFormat; mime: string }
  | { ok: false; reason: 'empty' | 'size' | 'format' | 'svg' | 'wrongKind' }

/** Đọc `length` byte đầu của tệp (FileReader chạy cả trong jsdom lẫn trình duyệt, không cần `Blob.arrayBuffer`). */
export function readHead(file: Blob, length: number = HEAD_BYTES): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error ?? new Error('Không đọc được tệp'))
    reader.readAsArrayBuffer(file.slice(0, length))
  })
}

/**
 * Kiểm tra một tệp cho ô loại `kind` (ảnh hoặc âm thanh): không rỗng, không quá dung lượng, không phải SVG, định dạng THẬT (magic bytes)
 * thuộc loại đúng. Mọi lý do từ chối dùng chung một câu của SRS (UC-05 3a).
 */
export async function checkMediaFile(file: File, kind: MediaKind): Promise<MediaCheck> {
  if (file.size === 0) return { ok: false, reason: 'empty' }
  if (file.size > MEDIA_LIMITS[kind].maxBytes) return { ok: false, reason: 'size' }
  if (declaresSvg(file)) return { ok: false, reason: 'svg' }

  const head = await readHead(file)

  if (looksLikeSvg(head)) return { ok: false, reason: 'svg' }

  const format = detectFormat(head)

  if (!format) return { ok: false, reason: 'format' }
  if (FORMAT_KIND[format] !== kind) return { ok: false, reason: 'wrongKind' }

  return { ok: true, format, mime: FORMAT_MIME[format] }
}

/** "1,2 MB", "340 KB": dung lượng dễ đọc để hiện cạnh tên tệp đã chọn. */
export function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`

  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}
