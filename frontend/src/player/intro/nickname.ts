export const NICKNAME_MAX = 20

export type NicknameCheck = { ok: true; value: string } | { ok: false; reason: 'empty' | 'tooLong' }

/** Luật biệt danh của máy chủ: sau trim và NFC, 1 đến 20 ký tự (đếm theo code point). Từ cấm do máy chủ kiểm. */
export function validateNickname(raw: string): NicknameCheck {
  const value = raw.normalize('NFC').trim()
  const count = [...value].length

  if (count === 0) return { ok: false, reason: 'empty' }

  return count > NICKNAME_MAX ? { ok: false, reason: 'tooLong' } : { ok: true, value }
}
