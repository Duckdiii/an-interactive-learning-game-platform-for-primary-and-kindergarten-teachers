import { describe, expect, it } from 'vitest'
import { buildMockGameContents } from '../../../services/mock/gameFixtures'
import type { WordScrambleQuestion } from '../../../types/game-dsl.types'
import { validateQuestion } from '../../../utils/gameValidation'
import { canReshuffle, isValidScramble, otherArrangementCount, reshuffle, scrambleLetters, seededRandom, setCorrectWord, splitLetters } from './scrambleEditing'

const game = buildMockGameContents().find((item) => item.gameType === 'WORD_SCRAMBLE')!
// Câu 1: "mẹ" xáo ["ẹ","m"]. Câu 3: "anh" xáo ["h","a","n"].
const base = (): WordScrambleQuestion => structuredClone(game.questions[2]) as WordScrambleQuestion
const issuesOf = (question: WordScrambleQuestion) => validateQuestion('WORD_SCRAMBLE', question, 0, 'save')
const key = (letters: ReadonlyArray<string>) => letters.map((letter) => letter.normalize('NFC').toUpperCase()).join('')
const sortedKey = (letters: ReadonlyArray<string>) => [...letters].map((letter) => letter.normalize('NFC').toUpperCase()).sort().join('')

describe('seededRandom', () => {
  it('cùng hạt giống thì cùng dãy số, nằm trong [0, 1), hạt khác thì dãy khác', () => {
    const a = seededRandom(42)
    const b = seededRandom(42)
    const first = Array.from({ length: 20 }, () => a())
    const second = Array.from({ length: 20 }, () => b())

    expect(first).toEqual(second)
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true)
    expect(Array.from({ length: 20 }, seededRandom(43))).not.toEqual(first)
  })
})

describe('splitLetters: tách theo code point sau NFC', () => {
  it('chữ có dấu: "mẹ" là 2 chữ; dạng tổ hợp (e + dấu nặng rời) được ghép lại thành một chữ', () => {
    expect(splitLetters('mẹ')).toEqual(['m', 'ẹ'])
    expect(splitLetters('mẹ')).toEqual(['m', 'ẹ'])
    expect(splitLetters('Việt')).toHaveLength(4)
  })

  it('đếm theo code point chứ không theo đơn vị UTF-16 (.length)', () => {
    expect('😀a'.length).toBe(3)
    expect(splitLetters('😀a')).toEqual(['😀', 'a'])
  })

  it('cắt khoảng trắng hai đầu và bỏ khoảng trắng ở giữa (không phải chữ để xáo)', () => {
    expect(splitLetters('  anh ')).toEqual(['a', 'n', 'h'])
    expect(splitLetters('con mèo')).toEqual(['c', 'o', 'n', 'm', 'è', 'o'])
    expect(splitLetters('   ')).toEqual([])
  })
})

describe('otherArrangementCount', () => {
  it('đếm số cách khác thứ tự gốc, không phân biệt hoa thường', () => {
    expect(otherArrangementCount(['A', 'A', 'A'])).toBe(0)
    expect(otherArrangementCount(['a', 'A'])).toBe(0)
    expect(otherArrangementCount(['m', 'ẹ'])).toBe(1)
    expect(otherArrangementCount(['A', 'B', 'A'])).toBe(2)
    expect(otherArrangementCount(['a', 'b', 'c'])).toBe(5)
    expect(otherArrangementCount(['a'])).toBe(0)
    expect(otherArrangementCount([])).toBe(0)
  })

  it('quá 10 chữ thì không tính (trả vô cực, từ vốn đã bị báo quá dài)', () => {
    expect(otherArrangementCount(Array.from({ length: 11 }, (_, index) => String(index)))).toBe(Infinity)
  })
})

describe('scrambleLetters: luôn là hoán vị hợp lệ và khác thứ tự gốc', () => {
  const words = ['mẹ', 'bố', 'anh', 'ABA', 'abba', 'Việt', 'con mèo', 'Hà Nội', 'abcdefghij', 'AAB', 'ôô ă']

  it.each(words)('"%s": với 300 hạt giống khác nhau luôn đủ các chữ, khác thứ tự gốc, cùng độ dài', (word) => {
    const original = splitLetters(word)

    for (let seed = 0; seed < 300; seed += 1) {
      const result = scrambleLetters(word, seededRandom(seed))

      expect(sortedKey(result), `seed ${seed}`).toBe(sortedKey(original))
      expect(result).toHaveLength(original.length)

      if (otherArrangementCount(original) > 0) expect(key(result), `seed ${seed}`).not.toBe(key(original))
    }
  })

  it('cùng hạt giống thì cùng kết quả (xác định)', () => {
    expect(scrambleLetters('abcdef', seededRandom(7))).toEqual(scrambleLetters('abcdef', seededRandom(7)))
  })

  it('từ chỉ có một loại chữ ("AAA", "aA") hoặc dưới 2 chữ: trả đúng thứ tự gốc, không lặp vô hạn', () => {
    expect(scrambleLetters('AAA', seededRandom(1))).toEqual(['A', 'A', 'A'])
    expect(scrambleLetters('aA', seededRandom(1))).toEqual(['a', 'A'])
    expect(scrambleLetters('a', seededRandom(1))).toEqual(['a'])
    expect(scrambleLetters('', seededRandom(1))).toEqual([])
  })

  it('hai chữ khác nhau chỉ có một cách hợp lệ: luôn đảo hai chữ (kể cả khi tránh cách đang hiện)', () => {
    expect(scrambleLetters('mẹ', seededRandom(3))).toEqual(['ẹ', 'm'])
    expect(scrambleLetters('mẹ', seededRandom(3), ['ẹ', 'm'])).toEqual(['ẹ', 'm'])
  })

  it('nguồn ngẫu nhiên "kẹt" cho ra đúng thứ tự gốc mãi (không đổi chỗ nào) vẫn dừng và vẫn khác thứ tự gốc nhờ bước đổi chỗ có chủ đích', () => {
    const stuck = () => 0.999999 // Fisher–Yates không đổi chỗ nào: luôn ra thứ tự gốc.
    const result = scrambleLetters('abc', stuck)

    expect(key(result)).not.toBe('ABC')
    expect(sortedKey(result)).toBe('ABC')
  })

  it('nguồn ngẫu nhiên luôn trả 0 cũng dừng và ra hoán vị hợp lệ', () => {
    const result = scrambleLetters('abcd', () => 0)

    expect(key(result)).not.toBe('ABCD')
    expect(sortedKey(result)).toBe('ABCD')
  })

  it('tránh cách đang hiện (`avoid`) khi còn cách khác: 200 hạt giống đều ra cách khác với cách đang hiện', () => {
    const current = ['b', 'c', 'a']

    for (let seed = 0; seed < 200; seed += 1) {
      const result = scrambleLetters('abc', seededRandom(seed), current)

      expect(key(result), `seed ${seed}`).not.toBe(key(current))
      expect(key(result), `seed ${seed}`).not.toBe('ABC')
    }
  })

  it('từ nhập dạng tổ hợp ("me" + dấu nặng rời) cho ra các chữ đã NFC', () => {
    const result = scrambleLetters('mẹ', seededRandom(5))

    expect(result).toEqual(['ẹ', 'm'])
    expect(result.every((letter) => letter === letter.normalize('NFC'))).toBe(true)
  })
})

describe('setCorrectWord: đổi từ thì xáo lại', () => {
  it('đặt từ mới (NFC, cắt khoảng trắng) và các chữ xáo khớp từ mới; qua được bộ kiểm tra', () => {
    for (const word of ['mẹ', 'bàngoại', 'ABA', 'Việt', 'abcdefghij']) {
      const q = setCorrectWord(base(), `  ${word}  `, seededRandom(9))

      expect(q.correctWord).toBe(word)
      expect(sortedKey(q.scrambledLetters)).toBe(sortedKey(splitLetters(word)))
      expect(issuesOf(q), word).toEqual([])
    }
  })

  it('từ nhập dạng tổ hợp được lưu dạng NFC', () => {
    expect(setCorrectWord(base(), 'mẹ', seededRandom(1)).correctWord).toBe('mẹ')
  })

  it('từ dán có khoảng trắng: lưu nguyên để báo lỗi "không được có khoảng trắng"; chữ xáo không chứa khoảng trắng', () => {
    const q = setCorrectWord(base(), 'con mèo', seededRandom(1))

    expect(q.correctWord).toBe('con mèo')
    expect(q.scrambledLetters.some((letter) => /\s/.test(letter))).toBe(false)
    expect(issuesOf(q).some((issue) => issue.field === 'correctWord' && issue.code === 'hasSpace')).toBe(true)
  })

  it('từ trống thì không có chữ xáo; từ 1 chữ hay quá 10 chữ thì bị báo đúng ô', () => {
    expect(setCorrectWord(base(), '   ', seededRandom(1)).scrambledLetters).toEqual([])
    expect(issuesOf(setCorrectWord(base(), 'a', seededRandom(1))).some((issue) => issue.field === 'correctWord' && issue.code === 'tooShort')).toBe(true)
    expect(issuesOf(setCorrectWord(base(), 'abcdefghijk', seededRandom(1))).some((issue) => issue.field === 'correctWord' && issue.code === 'tooLong')).toBe(true)
  })

  it('từ chỉ một loại chữ ("AAA") được chấp nhận (Backend cho qua)', () => {
    expect(issuesOf(setCorrectWord(base(), 'AAA', seededRandom(1)))).toEqual([])
  })

  it('không đổi bản cũ; giữ nguyên các trường khác của câu', () => {
    const before = base()
    const after = setCorrectWord(before, 'bố', seededRandom(1))

    expect(before.correctWord).toBe('anh')
    expect(after).toMatchObject({ id: before.id, points: before.points, timeLimitSeconds: before.timeLimitSeconds, audioText: before.audioText })
  })
})

describe('reshuffle (nút "Xáo lại")', () => {
  it('xáo theo từ đáp án HIỆN HÀNH và đổi cách đang hiện khi còn cách khác', () => {
    const before = base()

    for (let seed = 0; seed < 100; seed += 1) {
      const after = reshuffle(before, seededRandom(seed))

      expect(key(after.scrambledLetters), `seed ${seed}`).not.toBe(key(before.scrambledLetters))
      expect(issuesOf(after), `seed ${seed}`).toEqual([])
    }
  })

  it('theo bản vá lên câu hiện hành: dùng từ đáp án của câu lúc áp, không dùng từ cũ lúc bấm', () => {
    const edited = { ...base(), correctWord: 'bố', scrambledLetters: ['b', 'ố'] }

    expect(sortedKey(reshuffle(edited, seededRandom(1)).scrambledLetters)).toBe(sortedKey(['b', 'ố']))
  })

  it('nguồn kẹt, từ có chữ lặp ("aab") và cách đang hiện là cách duy nhất đạt được bằng một lần đổi chỗ kề nhau: vẫn tìm ra cách còn lại ("baa")', () => {
    const stuck = () => 0.999999

    expect(scrambleLetters('aab', stuck)).toEqual(['a', 'b', 'a'])
    expect(scrambleLetters('aab', stuck, ['a', 'b', 'a'])).toEqual(['b', 'a', 'a'])
  })

  it('nguồn ngẫu nhiên kẹt VÀ cách đang hiện trùng đúng kết quả kẹt: vẫn ra cách khác cả thứ tự gốc lẫn cách đang hiện', () => {
    const stuck = () => 0.999999
    const first = scrambleLetters('abc', stuck)
    const again = scrambleLetters('abc', stuck, first)

    expect(key(again)).not.toBe('ABC')
    expect(key(again)).not.toBe(key(first))
    expect(sortedKey(again)).toBe('ABC')
  })

  it('canReshuffle: chỉ khi còn hơn một cách khác thứ tự gốc', () => {
    expect(canReshuffle(base())).toBe(true)
    expect(canReshuffle({ ...base(), correctWord: 'mẹ', scrambledLetters: ['ẹ', 'm'] })).toBe(false)
    expect(canReshuffle({ ...base(), correctWord: 'AAA', scrambledLetters: ['A', 'A', 'A'] })).toBe(false)
    expect(canReshuffle({ ...base(), correctWord: '', scrambledLetters: [] })).toBe(false)
  })

  it('canReshuffle: từ chỉ có một cách xáo nhưng chữ xáo đang lưu SAI (trùng thứ tự gốc hoặc lệch bộ chữ) thì VẪN mở để sửa, không để giáo viên bị kẹt', () => {
    expect(canReshuffle({ ...base(), correctWord: 'mẹ', scrambledLetters: ['m', 'ẹ'] })).toBe(true)
    expect(canReshuffle({ ...base(), correctWord: 'mẹ', scrambledLetters: ['x', 'y'] })).toBe(true)
    expect(canReshuffle({ ...base(), correctWord: 'AAA', scrambledLetters: ['A', 'A'] })).toBe(true)
  })

  it('"Xáo lại" sửa được chữ xáo sai của từ chỉ có một cách xáo', () => {
    const broken = { ...base(), correctWord: 'mẹ', scrambledLetters: ['m', 'ẹ'] }

    expect(issuesOf(broken).some((issue) => issue.code === 'scrambleSame')).toBe(true)
    expect(issuesOf(reshuffle(broken, seededRandom(1)))).toEqual([])
  })
})

describe('isValidScramble', () => {
  it('đúng bộ chữ (không phân biệt hoa thường) và khác thứ tự gốc', () => {
    expect(isValidScramble('anh', ['h', 'a', 'n'])).toBe(true)
    expect(isValidScramble('anh', ['H', 'A', 'N'])).toBe(true)
    expect(isValidScramble('anh', ['a', 'n', 'h'])).toBe(false)
    expect(isValidScramble('anh', ['h', 'a'])).toBe(false)
    expect(isValidScramble('anh', ['h', 'a', 'x'])).toBe(false)
    expect(isValidScramble('AAA', ['A', 'A', 'A'])).toBe(true)
  })
})

describe('setCorrectWord: không xáo lại khi từ không đổi thật', () => {
  it('chỉ khác khoảng trắng đầu/cuối hoặc dạng tổ hợp thì giữ nguyên câu (cùng đối tượng) nếu chữ xáo còn hợp lệ', () => {
    const before = base()

    expect(setCorrectWord(before, 'anh ', seededRandom(1))).toBe(before)
    expect(setCorrectWord({ ...before, correctWord: 'mẹ', scrambledLetters: ['ẹ', 'm'] }, 'me\u0323', seededRandom(1)).scrambledLetters).toEqual(['ẹ', 'm'])
  })

  it('từ không đổi nhưng chữ xáo đang SAI thì vẫn xáo lại để sửa', () => {
    const broken = { ...base(), scrambledLetters: ['a', 'n', 'h'] }

    expect(setCorrectWord(broken, 'anh', seededRandom(1))).not.toBe(broken)
    expect(issuesOf(setCorrectWord(broken, 'anh', seededRandom(1)))).toEqual([])
  })
})

describe('khớp bộ kiểm tra', () => {
  it('câu mẫu của mock hợp lệ', () => {
    for (const question of game.questions) expect(issuesOf(question as WordScrambleQuestion)).toEqual([])
  })
})
