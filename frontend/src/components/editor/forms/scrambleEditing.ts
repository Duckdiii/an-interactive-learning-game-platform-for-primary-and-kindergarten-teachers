import type { WordScrambleQuestion } from '../../../types/game-dsl.types'

// Các phép sửa câu WORD_SCRAMBLE (hàm thuần, trả về bản mới, không đổi bản cũ). Chữ đã xáo KHÔNG do giáo viên gõ từng chữ mà được tạo từ từ đáp án: đổi từ
// thì xáo lại, nút "Xáo lại" cho ra cách xáo khác. Mọi cách tách chữ đếm theo CODE POINT sau chuẩn hóa NFC (đúng cách validator và Backend đếm), nên "mẹ" là
// 2 chữ ("m", "ẹ") dù người dùng gõ dạng tổ hợp. Nguồn ngẫu nhiên LUÔN do nơi gọi đưa vào (`random`), không gọi `Math.random` ở đây, để test xác định.

export type Random = () => number

const nfc = (value: string) => value.normalize('NFC')

// Như validator và Backend: so sánh chữ sau NFC, không phân biệt hoa thường.
const key = (letter: string) => nfc(letter).toUpperCase()

/** Bộ sinh số giả ngẫu nhiên có hạt giống (mulberry32), trả số trong [0, 1). Cùng `seed` thì cùng dãy số. */
export function seededRandom(seed: number): Random {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) | 0

    let t = Math.imul(state ^ (state >>> 15), 1 | state)

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Tách các chữ của từ theo code point sau NFC, bỏ khoảng trắng (khoảng trắng không phải chữ để xáo; từ có khoảng trắng đã bị báo lỗi ở ô từ đáp án). */
export function splitLetters(word: string): string[] {
  return [...nfc(word.trim())].filter((letter) => !/\s/.test(letter))
}

const sameOrder = (a: ReadonlyArray<string>, b: ReadonlyArray<string>) => a.length === b.length && a.every((letter, index) => key(letter) === key(b[index]))

/**
 * Số cách sắp xếp KHÁC thứ tự gốc (không tính cách giữ nguyên). Từ chỉ có một loại chữ ("AAA") thì không có cách nào khác: 0. Hai chữ khác nhau ("mẹ"):
 * đúng 1. Chỉ tính khi có không quá 10 chữ (giới hạn của DSL); nhiều hơn thì trả `Infinity` (từ quá dài vốn đã bị báo lỗi).
 */
export function otherArrangementCount(letters: ReadonlyArray<string>): number {
  if (letters.length > 10) return Infinity

  const counts = new Map<string, number>()

  for (const letter of letters) counts.set(key(letter), (counts.get(key(letter)) ?? 0) + 1)

  const factorial = (n: number): number => (n <= 1 ? 1 : n * factorial(n - 1))
  let arrangements = factorial(letters.length)

  for (const count of counts.values()) arrangements /= factorial(count)

  return Math.max(0, Math.round(arrangements) - 1)
}

function shuffled(letters: ReadonlyArray<string>, random: Random): string[] {
  const result = [...letters]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1))

    ;[result[index], result[other]] = [result[other], result[index]]
  }

  return result
}

// Đổi chỗ hai chữ KHÁC nhau đầu tiên: dùng khi xáo ngẫu nhiên vẫn trùng thứ tự gốc. Đảm bảo khác khi kết quả đang bằng thứ tự gốc (hai vị trí khác nhau đổi chỗ).
function forceDifferent(letters: string[]): string[] {
  const result = [...letters]

  for (let first = 0; first < result.length; first += 1) {
    for (let second = first + 1; second < result.length; second += 1) {
      if (key(result[first]) !== key(result[second])) {
        ;[result[first], result[second]] = [result[second], result[first]]

        return result
      }
    }
  }

  return result
}

const MAX_ATTEMPTS = 50

/**
 * Xáo các chữ của `word` thành một hoán vị hợp lệ KHÁC thứ tự gốc (so không phân biệt hoa thường, sau NFC). Luôn dừng: thử xáo tối đa 50 lần rồi đổi chỗ có chủ đích,
 * không vòng lặp vô hạn. Trường hợp không thể khác (dưới 2 chữ, hoặc chỉ có một loại chữ như "AAA"): trả đúng thứ tự gốc, validator chấp nhận.
 * `avoid` (cách xáo đang hiện) được tránh khi còn cách khác, để nút "Xáo lại" luôn đổi thứ tự thấy được.
 */
export function scrambleLetters(word: string, random: Random, avoid?: ReadonlyArray<string>): string[] {
  const original = splitLetters(word)

  if (otherArrangementCount(original) === 0) return original

  const wantsDifferentFromAvoid = avoid !== undefined && otherArrangementCount(original) > 1

  const acceptable = (candidate: ReadonlyArray<string>) => !sameOrder(candidate, original) && !(wantsDifferentFromAvoid && avoid && sameOrder(candidate, avoid))

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = shuffled(original, random)

    if (acceptable(candidate)) return candidate
  }

  // Nguồn ngẫu nhiên kẹt: tìm có chủ đích (không còn ngẫu nhiên). Hoán vị khác thứ tự gốc luôn tồn tại (đã kiểm ở trên); thử đổi chỗ hai chữ kề nhau từ vài điểm xuất phát
  // để vừa khác thứ tự gốc vừa khác cách đang hiện, rồi mới chịu chỉ khác thứ tự gốc.
  const starts = [shuffled(original, random), forceDifferent(original)]

  for (const start of starts) {
    for (let index = 0; index < start.length - 1; index += 1) {
      const swapped = [...start]

      ;[swapped[index], swapped[index + 1]] = [swapped[index + 1], swapped[index]]

      if (acceptable(swapped)) return swapped
    }

    if (acceptable(start)) return start
  }

  // Không tới được (luôn có một cách hợp lệ ở các bước trên khi còn cách khác thứ tự gốc); giữ để hàm luôn trả một hoán vị.
  return forceDifferent(original)
}

/** Các chữ đã xáo (`letters`) có hợp lệ với từ không: đúng bộ chữ và (nếu có thể) khác thứ tự gốc. Dữ liệu từ AI hoặc bản cũ có thể không hợp lệ. */
export function isValidScramble(word: string, letters: ReadonlyArray<string>): boolean {
  const original = splitLetters(word)
  const sortedKeys = (list: ReadonlyArray<string>) => list.map(key).sort().join('\u0000')

  if (sortedKeys(original) !== sortedKeys(letters)) return false

  return otherArrangementCount(original) === 0 || !sameOrder(letters, original)
}

/** Đặt từ đáp án (đã NFC, cắt khoảng trắng hai đầu) và xáo lại các chữ theo từ mới: không bao giờ để chữ đã xáo lệch với từ. */
export function setCorrectWord(question: WordScrambleQuestion, value: string, random: Random): WordScrambleQuestion {
  const correctWord = nfc(value).trim()

  // Từ không đổi thật (chỉ khác khoảng trắng đầu/cuối hoặc dạng NFC) và chữ xáo hiện tại còn hợp lệ: giữ nguyên, không xáo lại không cần thiết.
  if (correctWord === question.correctWord && isValidScramble(correctWord, question.scrambledLetters)) return question

  return { ...question, correctWord, scrambledLetters: scrambleLetters(correctWord, random) }
}

/** "Xáo lại": xáo theo từ đáp án HIỆN HÀNH, tránh cách đang hiện khi còn cách khác. */
export function reshuffle(question: WordScrambleQuestion, random: Random): WordScrambleQuestion {
  return { ...question, scrambledLetters: scrambleLetters(question.correctWord, random, question.scrambledLetters) }
}

/**
 * "Xáo lại" có ích không: còn hơn một cách sắp xếp khác thứ tự gốc để chọn. Với đúng một cách (hoặc không cách nào), nút chỉ mở khi chữ xáo đang lưu KHÔNG hợp lệ
 * (dữ liệu từ AI hoặc bản cũ): khi đó bấm là sửa được, nếu khóa thì giáo viên bị kẹt vì gõ lại cùng một từ không kích hoạt gì.
 */
export function canReshuffle(question: WordScrambleQuestion) {
  const letters = splitLetters(question.correctWord)

  if (letters.length === 0) return false

  return otherArrangementCount(letters) > 1 || !isValidScramble(question.correctWord, question.scrambledLetters)
}
