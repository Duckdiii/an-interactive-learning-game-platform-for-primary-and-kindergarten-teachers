import { normalizeSearchText } from './gameFilters'

// So khớp từ khóa của các hàm đoán (mock) theo RANH GIỚI TỪ, không theo chuỗi con. Văn bản được bỏ dấu và dấu câu, ghép
// bằng một dấu cách, rồi bọc dấu cách hai đầu; từ khóa cũng được bọc như vậy. Nhờ đó "hoàn toàn" không khớp "toán",
// "ban đêm" không khớp "đếm", "nghề nghiệp" không khớp "nghe". Từ khóa nên là cụm từ đủ nghĩa ("mon toan", "dem so").
export function toMatchText(text: string) {
  return ` ${normalizeSearchText(text).replace(/[^a-z0-9]+/g, ' ').trim()} `
}

export const hasPhrase = (matchText: string, phrase: string) =>
  matchText.includes(` ${phrase.trim()} `)
