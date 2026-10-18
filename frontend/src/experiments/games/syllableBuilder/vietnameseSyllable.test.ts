import { describe, expect, it } from 'vitest'
import {
  applyTone,
  composeSyllable,
  isKnownSyllable,
  LEXICON_PARTS,
  sameSyllable,
  SPELLING_HINT,
  spellingProblem,
  TONE_LABEL,
  TONES,
  type SpellingProblem,
  type SyllableParts,
  type Tone,
} from './vietnameseSyllable'

const p = (onset: string, rhyme: string, tone: Tone): SyllableParts => ({ onset, rhyme, tone })
const isNfc = (s: string) => s === s.normalize('NFC')

describe('applyTone: vị trí dấu thanh', () => {
  it.each<[string, Tone, string]>([
    // một nguyên âm
    ['a', 'SAC', 'á'],
    ['a', 'HUYEN', 'à'],
    ['a', 'HOI', 'ả'],
    ['a', 'NGA', 'ã'],
    ['a', 'NANG', 'ạ'],
    ['a', 'NGANG', 'a'],
    // nguyên âm có dấu phụ: dấu thanh chồng lên dấu phụ
    ['â', 'SAC', 'ấ'],
    ['ơ', 'NANG', 'ợ'],
    ['ư', 'HOI', 'ử'],
    ['ă', 'HUYEN', 'ằ'],
    ['ê', 'NGA', 'ễ'],
    // có âm cuối: dấu ở nguyên âm cuối của cụm nguyên âm
    ['oan', 'SAC', 'oán'],
    ['uyt', 'SAC', 'uýt'],
    ['oen', 'HUYEN', 'oèn'],
    ['ach', 'SAC', 'ách'],
    ['ăng', 'NGANG', 'ăng'],
    ['ang', 'NANG', 'ạng'],
    // hai nguyên âm, vần mở: dấu ở chữ thứ nhất
    ['ai', 'HUYEN', 'ài'],
    ['ao', 'SAC', 'áo'],
    ['au', 'NANG', 'ạu'],
    ['eo', 'HUYEN', 'èo'],
    ['ia', 'SAC', 'ía'],
    ['ua', 'HUYEN', 'ùa'],
    ['iu', 'NANG', 'ịu'],
    ['ui', 'SAC', 'úi'],
    // hai nguyên âm có dấu phụ: dấu ở chữ có dấu phụ
    ['ưa', 'NGA', 'ữa'],
    ['ôi', 'HUYEN', 'ồi'],
    ['ơi', 'SAC', 'ới'],
    ['uê', 'SAC', 'uế'],
    ['iê', 'NANG', 'iệ'],
    ['uô', 'HUYEN', 'uồ'],
    // ươ: dấu ở ơ
    ['ươ', 'NANG', 'ượ'],
    ['ươi', 'HUYEN', 'ười'],
    // ba nguyên âm không dấu phụ: chữ ở giữa
    ['oai', 'HUYEN', 'oài'],
    ['oay', 'SAC', 'oáy'],
    ['uai', 'HOI', 'uải'],
    // ba nguyên âm có dấu phụ
    ['iêu', 'HUYEN', 'iều'],
    ['yêu', 'SAC', 'yếu'],
  ])('%s + %s = %s', (rhyme, tone, expected) => {
    expect(applyTone(rhyme, tone)).toBe(expected.normalize('NFC'))
  })

  it('oa, oe, uy: kiểu hiện đại đặt dấu chữ thứ nhất (hòa), kiểu cũ đặt chữ thứ hai (hoà)', () => {
    expect(applyTone('oa', 'HUYEN', 'modern')).toBe('òa')
    expect(applyTone('oa', 'HUYEN', 'traditional')).toBe('oà')
    expect(applyTone('oe', 'HOI', 'modern')).toBe('ỏe')
    expect(applyTone('oe', 'HOI', 'traditional')).toBe('oẻ')
    expect(applyTone('uy', 'HOI', 'modern')).toBe('ủy')
    expect(applyTone('uy', 'HOI', 'traditional')).toBe('uỷ')
  })

  it('kiểu đặt dấu không ảnh hưởng nơi hai kiểu giống nhau', () => {
    for (const rhyme of ['a', 'ai', 'ao', 'ươ', 'oan', 'oai', 'iê']) {
      for (const tone of TONES) expect(applyTone(rhyme, tone, 'modern')).toBe(applyTone(rhyme, tone, 'traditional'))
    }
  })

  it('vần không bắt đầu bằng nguyên âm thì từ chối', () => {
    expect(applyTone('', 'SAC')).toBeNull()
    expect(applyTone('ng', 'SAC')).toBeNull()
    expect(applyTone('ba', 'SAC')).toBeNull()
  })

  it('kết quả luôn ở dạng NFC và mang đúng một dấu thanh', () => {
    for (const rhyme of ['a', 'ơ', 'oa', 'ươ', 'iêu', 'oan', 'ach']) {
      for (const tone of TONES) {
        const out = applyTone(rhyme, tone)!
        expect(isNfc(out)).toBe(true)
        const marks = [...out.normalize('NFD')].filter((c) => '̣̀́̉̃'.includes(c))
        expect(marks).toHaveLength(tone === 'NGANG' ? 0 : 1)
      }
    }
  })

  it('đầu vào dạng NFD (tách dấu) cho cùng kết quả như NFC', () => {
    expect(applyTone('ơ'.normalize('NFD'), 'SAC')).toBe(applyTone('ơ', 'SAC'))
    expect(applyTone('ươ'.normalize('NFD'), 'NANG')).toBe(applyTone('ươ', 'NANG'))
  })
})

describe('composeSyllable', () => {
  it.each<[SyllableParts, string]>([
    [p('b', 'a', 'SAC'), 'bá'],
    [p('m', 'eo', 'HUYEN'), 'mèo'],
    [p('', 'ao', 'NGANG'), 'ao'],
    [p('ngh', 'i', 'HOI'), 'nghỉ'],
    [p('qu', 'a', 'HOI'), 'quả'],
    [p('th', 'uy', 'HOI'), 'thủy'],
    [p('h', 'oa', 'HUYEN'), 'hòa'],
    [p('kh', 'oe', 'HOI'), 'khỏe'],
    [p('s', 'ach', 'SAC'), 'sách'],
    [p('tr', 'ăng', 'NGANG'), 'trăng'],
    [p('đ', 'ư', 'NANG'), 'đự'],
  ])('%j → %s', (parts, expected) => {
    expect(composeSyllable(parts)).toBe(expected.normalize('NFC'))
  })

  it('kiểu cũ: hoà, khoẻ, thuỷ', () => {
    expect(composeSyllable(p('h', 'oa', 'HUYEN'), 'traditional')).toBe('hoà')
    expect(composeSyllable(p('kh', 'oe', 'HOI'), 'traditional')).toBe('khoẻ')
    expect(composeSyllable(p('th', 'uy', 'HOI'), 'traditional')).toBe('thuỷ')
  })

  it('vần hỏng thì null', () => {
    expect(composeSyllable(p('b', 'ng', 'SAC'))).toBeNull()
  })
})

describe('sameSyllable', () => {
  it('NFC và NFD của cùng một tiếng là một', () => {
    expect(sameSyllable('hòa'.normalize('NFD'), 'hòa'.normalize('NFC'))).toBe(true)
    expect(sameSyllable('ươ'.normalize('NFD'), 'ươ')).toBe(true)
  })
  it('không phân biệt hoa thường', () => {
    expect(sameSyllable('HÒA', 'hòa')).toBe(true)
  })
  it('khác dấu thanh hoặc khác chữ là khác', () => {
    expect(sameSyllable('ma', 'má')).toBe(false)
    // Hai kiểu đặt dấu là hai chuỗi khác nhau: người ra đề phải chọn một kiểu.
    expect(sameSyllable('hòa', 'hoà')).toBe(false)
  })
})

describe('âm đầu «gi»', () => {
  it('chỉ viết một chữ i: gì, gia, giêng; gi + a có dấu thì dấu ở a', () => {
    expect(composeSyllable(p('gi', 'i', 'HUYEN'))).toBe('gì')
    expect(composeSyllable(p('gi', 'ia', 'NGANG'))).toBe('gia')
    expect(composeSyllable(p('gi', 'a', 'SAC'))).toBe('giá')
    expect(composeSyllable(p('gi', 'êng', 'NGANG'))).toBe('giêng')
    expect(composeSyllable(p('gi', 'o', 'SAC'))).toBe('gió')
  })

  it('gi không có luật c/k hay g/gh riêng; g trước i vẫn phải là gh (ghi)', () => {
    expect(spellingProblem(p('gi', 'i', 'HUYEN'))).toBeNull()
    expect(spellingProblem(p('gi', 'a', 'SAC'))).toBeNull()
    expect(spellingProblem(p('g', 'i', 'NGANG'))).toBe('USE_GH')
    expect(spellingProblem(p('gh', 'i', 'NGANG'))).toBeNull()
    expect(composeSyllable(p('gh', 'i', 'NGANG'))).toBe('ghi')
  })

  it('không ảnh hưởng âm đầu khác khi vần bắt đầu bằng i (kì, nghỉ)', () => {
    expect(composeSyllable(p('k', 'i', 'HUYEN'))).toBe('kì')
    expect(composeSyllable(p('ngh', 'i', 'HOI'))).toBe('nghỉ')
  })
})

describe('spellingProblem', () => {
  it.each<[SyllableParts, SpellingProblem | null]>([
    [p('c', 'i', 'NGANG'), 'USE_K'],
    [p('c', 'e', 'NGANG'), 'USE_K'],
    [p('c', 'ê', 'NGANG'), 'USE_K'],
    [p('c', 'iê', 'NGANG'), 'USE_K'],
    [p('c', 'y', 'NGANG'), 'USE_K'],
    [p('c', 'a', 'NGANG'), null],
    [p('c', 'ô', 'NGANG'), null],
    [p('c', 'ơ', 'NGANG'), null],
    [p('c', 'u', 'NGANG'), null],
    [p('k', 'a', 'NGANG'), 'USE_C'],
    [p('k', 'ô', 'NGANG'), 'USE_C'],
    [p('k', 'ê', 'NGANG'), null],
    [p('k', 'i', 'NGANG'), null],
    [p('k', 'y', 'NGANG'), null],
    [p('g', 'e', 'NGANG'), 'USE_GH'],
    [p('g', 'i', 'NGANG'), 'USE_GH'],
    [p('g', 'a', 'NGANG'), null],
    [p('gh', 'a', 'NGANG'), 'USE_G'],
    [p('gh', 'ô', 'NGANG'), 'USE_G'],
    [p('gh', 'ê', 'NGANG'), null],
    [p('ng', 'i', 'NGANG'), 'USE_NGH'],
    [p('ng', 'ê', 'NGANG'), 'USE_NGH'],
    [p('ng', 'a', 'NGANG'), null],
    [p('ngh', 'a', 'NGANG'), 'USE_NG'],
    [p('ngh', 'i', 'NGANG'), null],
    [p('q', 'a', 'NGANG'), 'USE_QU'],
    [p('qu', 'a', 'NGANG'), null],
    [p('', 'a', 'NGANG'), null],
    [p('b', 'ng', 'NGANG'), 'BAD_RHYME'],
  ])('%j → %s', (parts, expected) => {
    expect(spellingProblem(parts)).toBe(expected)
  })

  it.each(['c', 'ch', 'p', 't'])('âm cuối %s chỉ nhận thanh sắc, nặng; ngang, huyền, hỏi, ngã đều bị báo', (final) => {
    const rhyme = `a${final}`
    expect(spellingProblem(p('b', rhyme, 'SAC'))).toBeNull()
    expect(spellingProblem(p('b', rhyme, 'NANG'))).toBeNull()
    for (const tone of ['NGANG', 'HUYEN', 'HOI', 'NGA'] as const) expect(spellingProblem(p('b', rhyme, tone))).toBe('STOP_FINAL_TONE')
  })

  it('âm cuối khác (m, n, ng, nh) nhận mọi thanh', () => {
    for (const final of ['m', 'n', 'ng', 'nh']) {
      for (const tone of TONES) expect(spellingProblem(p('b', `a${final}`, tone))).toBeNull()
    }
  })

  it('mọi mã lỗi đều có lời nhắc nhẹ nhàng, không có chữ đỏ hay chữ "sai"', () => {
    const codes: SpellingProblem[] = ['USE_K', 'USE_C', 'USE_GH', 'USE_G', 'USE_NGH', 'USE_NG', 'USE_QU', 'STOP_FINAL_TONE', 'BAD_RHYME']
    for (const code of codes) {
      expect(SPELLING_HINT[code].length).toBeGreaterThan(5)
      expect(SPELLING_HINT[code].toLowerCase()).not.toContain('sai ')
    }
  })
})

describe('từ điển nhỏ', () => {
  it('mọi mục ghép được, không vi phạm luật chính tả và ở dạng NFC', () => {
    expect(LEXICON_PARTS.length).toBeGreaterThanOrEqual(40)
    for (const parts of LEXICON_PARTS) {
      const syllable = composeSyllable(parts)
      expect([JSON.stringify(parts), syllable === null]).toEqual([JSON.stringify(parts), false])
      expect([syllable, spellingProblem(parts)]).toEqual([syllable, null])
      expect(isNfc(syllable!)).toBe(true)
    }
  })

  it('không có hai mục ghép ra cùng một tiếng', () => {
    const all = LEXICON_PARTS.map((parts) => composeSyllable(parts)!)
    expect(new Set(all).size).toBe(all.length)
  })

  it('biết tiếng thật, kể cả khi viết dạng NFD, và từ chối tiếng không có', () => {
    expect(isKnownSyllable('mèo')).toBe(true)
    expect(isKnownSyllable('mèo'.normalize('NFD'))).toBe(true)
    expect(isKnownSyllable('hòa')).toBe(true)
    expect(isKnownSyllable('hoà')).toBe(false)
    expect(isKnownSyllable('hoà', 'traditional')).toBe(true)
    expect(isKnownSyllable('xyz')).toBe(false)
    expect(isKnownSyllable('')).toBe(false)
  })
})

describe('nhãn thanh', () => {
  it('đủ sáu thanh, mỗi thanh có nhãn khác nhau', () => {
    expect(TONES).toHaveLength(6)
    expect(new Set(TONES.map((t) => TONE_LABEL[t])).size).toBe(6)
  })
})
