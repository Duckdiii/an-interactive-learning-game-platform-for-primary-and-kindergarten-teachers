import { viText } from '../constants/viText'

export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 72

export interface PasswordStrength {
  level: 0 | 1 | 2 | 3
  label: string
}

// Đúng luật của Backend (RegisterRequest.java): `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,72}$` cộng tối đa 72 byte UTF-8.
// Nhóm ký tự là ASCII như Backend: chữ có dấu (ế, Đ) tính là "ký tự đặc biệt", không phải chữ hoa/thường. Chỉ mức 3 là chắc chắn được nhận.
const GROUPS = [
  { re: /[a-z]/, name: 'lower' },
  { re: /[A-Z]/, name: 'upper' },
  { re: /\d/, name: 'digit' },
  { re: /[^A-Za-z0-9]/, name: 'special' },
] as const

export function passwordStrength(password: string): PasswordStrength {
  const labels = viText.auth.strength
  const length = [...password].length

  if (length < MIN_PASSWORD_LENGTH) return { level: 0, label: labels.tooShort }
  if (length > MAX_PASSWORD_LENGTH || new TextEncoder().encode(password).length > MAX_PASSWORD_LENGTH) return { level: 0, label: labels.tooLong }

  const missing = GROUPS.filter((group) => !group.re.test(password)).map((group) => labels.groups[group.name])

  if (missing.length === 0) return { level: 3, label: labels.ok }

  return { level: missing.length === 1 ? 2 : 1, label: labels.missing(missing) }
}
