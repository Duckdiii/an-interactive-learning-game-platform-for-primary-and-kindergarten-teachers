import axios from 'axios'

export type PublishErrorKind = 'notFound' | 'notPublished' | 'expired' | 'disabled' | 'network'

const JOIN_CODE_FORMAT = /^[A-Z0-9]{6}$/

// Mã chia sẻ gõ tay: bỏ mọi khoảng trắng (cả giữa mã) và viết hoa.
export const normalizeJoinCode = (raw: string) => raw.replace(/\s+/g, '').toUpperCase()

export const isJoinCodeFormat = (code: string) => JOIN_CODE_FORMAT.test(code)

// PIN phòng là 6 chữ số; mã chia sẻ cũng có thể toàn số nên /join phải thử PIN trước rồi mới thử mã chia sẻ.
export const isRoomPin = (code: string) => /^\d{6}$/.test(code)

const KIND_BY_ERROR_CODE: Readonly<Record<string, PublishErrorKind>> = {
  GAME_NOT_PUBLISHED: 'notPublished',
  GAME_EXPIRED: 'expired',
  GAME_DISABLED: 'disabled',
}

// Có phản hồi từ Backend thì tra theo error.code (mã lạ = không tìm thấy); không có phản hồi hoặc lỗi lạ = lỗi mạng.
export function publishErrorKind(error: unknown): PublishErrorKind {
  if (!axios.isAxiosError(error) || !error.response) return 'network'

  const code = (error.response.data as { error?: { code?: unknown } } | undefined)?.error?.code

  // Object.hasOwn: mã như "constructor" không được rơi vào thuộc tính của prototype.
  return typeof code === 'string' && Object.hasOwn(KIND_BY_ERROR_CODE, code) ? KIND_BY_ERROR_CODE[code] : 'notFound'
}
