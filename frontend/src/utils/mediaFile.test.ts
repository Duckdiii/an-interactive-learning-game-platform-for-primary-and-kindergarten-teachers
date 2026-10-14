import { describe, expect, it } from 'vitest'
import { checkMediaFile, detectFormat, formatFileSize, looksLikeSvg, MEDIA_LIMITS } from './mediaFile'

const bytes = (...values: number[]) => new Uint8Array(values)
const ascii = (text: string) => Array.from(text, (char) => char.charCodeAt(0))
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]
const WEBP = [...ascii('RIFF'), 0x24, 0, 0, 0, ...ascii('WEBP'), ...ascii('VP8 ')]
const MP3_ID3 = [...ascii('ID3'), 3, 0, 0, 0, 0, 0, 0x21]
const MP3_FRAME = [0xff, 0xfb, 0x90, 0x64, 0, 0, 0, 0]

function fileOf(content: number[] | string, name: string, type = '') {
  const data = typeof content === 'string' ? content : new Uint8Array(content)

  return new File([data], name, { type })
}

describe('detectFormat (đọc byte đầu của tệp)', () => {
  it('nhận ra PNG, JPEG, WebP và MP3 (có thẻ ID3 hoặc bắt đầu thẳng bằng khung MPEG Layer III)', () => {
    expect(detectFormat(bytes(...PNG))).toBe('png')
    expect(detectFormat(bytes(...JPEG))).toBe('jpeg')
    expect(detectFormat(bytes(...WEBP))).toBe('webp')
    expect(detectFormat(bytes(...MP3_ID3))).toBe('mp3')
    expect(detectFormat(bytes(...MP3_FRAME))).toBe('mp3')
  })

  it('không nhận nhầm: GIF, PDF, WAV (cũng bắt đầu bằng RIFF), tệp thực thi, khung MPEG Layer I/II, MPEG phiên bản cấm, tệp quá ngắn', () => {
    expect(detectFormat(bytes(...ascii('GIF89a')))).toBeNull()
    expect(detectFormat(bytes(...ascii('%PDF-1.7')))).toBeNull()
    expect(detectFormat(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WAVEfmt ')))).toBeNull()
    expect(detectFormat(bytes(0x4d, 0x5a, 0x90, 0))).toBeNull()
    // 0xFF 0xFD = MPEG-1 Layer II, 0xFF 0xFF = Layer I; 0xFF 0xE9 = phiên bản "cấm" (01).
    expect(detectFormat(bytes(0xff, 0xfd, 0x90, 0))).toBeNull()
    expect(detectFormat(bytes(0xff, 0xff, 0x90, 0))).toBeNull()
    expect(detectFormat(bytes(0xff, 0xeb, 0x90, 0))).toBeNull()
    expect(detectFormat(bytes(0x89, 0x50))).toBeNull()
    expect(detectFormat(bytes())).toBeNull()
  })
})

describe('looksLikeSvg', () => {
  it('nhận SVG và XML kể cả có BOM, khoảng trắng, chữ hoa; không nhận ảnh nhị phân', () => {
    expect(looksLikeSvg(bytes(...ascii('<svg xmlns="http://www.w3.org/2000/svg"></svg>')))).toBe(true)
    expect(looksLikeSvg(bytes(...ascii('  \n<?xml version="1.0"?><svg/>')))).toBe(true)
    expect(looksLikeSvg(bytes(0xef, 0xbb, 0xbf, ...ascii('<SVG>')))).toBe(true)
    expect(looksLikeSvg(bytes(...PNG))).toBe(false)
  })
})

describe('checkMediaFile', () => {
  it('chấp nhận ảnh PNG, JPEG, WebP cho ô ảnh và MP3 cho ô âm thanh, trả về định dạng THẬT', async () => {
    await expect(checkMediaFile(fileOf(PNG, 'a.png'), 'image')).resolves.toEqual({ ok: true, format: 'png', mime: 'image/png' })
    await expect(checkMediaFile(fileOf(JPEG, 'a.jpg'), 'image')).resolves.toMatchObject({ ok: true, format: 'jpeg' })
    await expect(checkMediaFile(fileOf(WEBP, 'a.webp'), 'image')).resolves.toMatchObject({ ok: true, format: 'webp' })
    await expect(checkMediaFile(fileOf(MP3_ID3, 'a.mp3'), 'audio')).resolves.toEqual({ ok: true, format: 'mp3', mime: 'audio/mpeg' })
    await expect(checkMediaFile(fileOf(MP3_FRAME, 'a.mp3'), 'audio')).resolves.toMatchObject({ ok: true })
  })

  it('tin vào NỘI DUNG, không tin đuôi tệp hay loại MIME: đổi tên tệp thực thi thành .png vẫn bị từ chối', async () => {
    const fake = fileOf([0x4d, 0x5a, 0x90, 0, 3, 0, 0, 0], 'anh-dep.png', 'image/png')

    await expect(checkMediaFile(fake, 'image')).resolves.toEqual({ ok: false, reason: 'format' })
    // Ngược lại: ảnh thật nhưng đặt đuôi lạ vẫn được nhận.
    await expect(checkMediaFile(fileOf(PNG, 'anh.dat'), 'image')).resolves.toMatchObject({ ok: true, format: 'png' })
  })

  it('từ chối SVG dù đặt tên .png, khai báo loại ảnh hay chỉ có phần đuôi svg', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'

    await expect(checkMediaFile(fileOf(svg, 'hinh.svg', 'image/svg+xml'), 'image')).resolves.toEqual({ ok: false, reason: 'svg' })
    await expect(checkMediaFile(fileOf(svg, 'hinh.png', 'image/png'), 'image')).resolves.toEqual({ ok: false, reason: 'svg' })
    await expect(checkMediaFile(fileOf(PNG, 'hinh.SVG'), 'image')).resolves.toEqual({ ok: false, reason: 'svg' })
    await expect(checkMediaFile(fileOf(PNG, 'hinh.png', 'image/svg+xml'), 'image')).resolves.toEqual({ ok: false, reason: 'svg' })
  })

  it('từ chối đúng LOẠI ô: MP3 ở ô ảnh, ảnh ở ô âm thanh', async () => {
    await expect(checkMediaFile(fileOf(MP3_ID3, 'a.mp3'), 'image')).resolves.toEqual({ ok: false, reason: 'wrongKind' })
    await expect(checkMediaFile(fileOf(PNG, 'a.png'), 'audio')).resolves.toEqual({ ok: false, reason: 'wrongKind' })
  })

  it('từ chối tệp rỗng và tệp có định dạng khác (GIF, WAV)', async () => {
    await expect(checkMediaFile(fileOf([], 'a.png'), 'image')).resolves.toEqual({ ok: false, reason: 'empty' })
    await expect(checkMediaFile(fileOf(ascii('GIF89a....'), 'a.gif'), 'image')).resolves.toEqual({ ok: false, reason: 'format' })
    await expect(checkMediaFile(fileOf([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WAVE')], 'a.wav'), 'audio')).resolves.toEqual({ ok: false, reason: 'format' })
  })

  it('giới hạn dung lượng: ảnh đúng 5MB còn được, hơn 1 byte thì không; âm thanh 10MB tương tự', async () => {
    const padded = (head: number[], size: number, name: string) => {
      const data = new Uint8Array(size)

      data.set(head)

      return new File([data], name)
    }

    await expect(checkMediaFile(padded(PNG, MEDIA_LIMITS.image.maxBytes, 'a.png'), 'image')).resolves.toMatchObject({ ok: true })
    await expect(checkMediaFile(padded(PNG, MEDIA_LIMITS.image.maxBytes + 1, 'a.png'), 'image')).resolves.toEqual({ ok: false, reason: 'size' })
    await expect(checkMediaFile(padded(MP3_ID3, MEDIA_LIMITS.audio.maxBytes, 'a.mp3'), 'audio')).resolves.toMatchObject({ ok: true })
    await expect(checkMediaFile(padded(MP3_ID3, MEDIA_LIMITS.audio.maxBytes + 1, 'a.mp3'), 'audio')).resolves.toEqual({ ok: false, reason: 'size' })
    // Ảnh 6MB vẫn nằm dưới giới hạn âm thanh nhưng phải bị chặn ở ô ảnh.
    await expect(checkMediaFile(padded(PNG, 6 * 1024 * 1024, 'a.png'), 'image')).resolves.toEqual({ ok: false, reason: 'size' })
  })
})

describe('formatFileSize', () => {
  it('KB cho tệp nhỏ (tối thiểu 1 KB), MB một chữ số thập phân dấu phẩy', () => {
    expect(formatFileSize(1)).toBe('1 KB')
    expect(formatFileSize(340 * 1024)).toBe('340 KB')
    expect(formatFileSize(Math.round(1.25 * 1024 * 1024))).toBe('1,3 MB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5,0 MB')
  })
})
