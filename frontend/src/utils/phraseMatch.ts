import { normalizeSearchText } from './gameFilters'

// So khớp từ khóa của các hàm đoán (mock) theo RANH GIỚI TỪ, không theo chuỗi con. Văn bản được bỏ dấu và dấu câu, ghép
// bằng một dấu cách, rồi bọc dấu cách hai đầu; từ khóa cũng được bọc như vậy. Nhờ đó "hoàn toàn" không khớp "toán",
// "ban đêm" không khớp "đếm", "nghề nghiệp" không khớp "nghe". Từ khóa nên là cụm từ đủ nghĩa ("mon toan", "dem so").
export function toMatchText(text: string) {
  return ` ${normalizeSearchText(text).replace(/[^a-z0-9]+/g, ' ').trim()} `
}

export const hasPhrase = (matchText: string, phrase: string) =>
  matchText.includes(` ${phrase.trim()} `)

// Như trên nhưng GIỮ DẤU: bỏ dấu làm "bàn" trùng "bắn", "nhất" trùng "nhặt", "tạo" trùng "táo".
export function toAccentMatchText(text: string) {
  return ` ${text.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `
}

/** Giáo viên gõ có dấu thì so khớp giữ dấu (`accented`); gõ không dấu thì chỉ dùng các cụm không dấu đủ rõ (`plain`). */
export function mentionsAny(text: string, accented: readonly string[], plain: readonly string[]) {
  // Chỉ tính chữ có dấu/đ; ngoặc cong, "…", emoji dán từ Word không làm câu không dấu thành "có dấu".
  const hasDiacritics = /\p{M}|đ/iu.test(text.normalize('NFD'))
  const matchText = hasDiacritics ? toAccentMatchText(text) : toMatchText(text)
  return (hasDiacritics ? accented : plain).some((phrase) => hasPhrase(matchText, phrase))
}
