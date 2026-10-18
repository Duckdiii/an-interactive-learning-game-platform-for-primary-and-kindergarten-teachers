/**
 * Ghép tiếng Việt: âm đầu + vần (chưa có dấu thanh) + dấu thanh → tiếng viết đúng chính tả, chuẩn hóa NFC.
 * Chỉ phủ tập nhỏ cho lớp 1; các luật dưới đây là bản đơn giản hóa, CHƯA được chuyên gia ngôn ngữ xác nhận
 * (đặc biệt vị trí dấu thanh ở oa, oe, uy: `hòa` hay `hoà`).
 */
export type Tone = 'NGANG' | 'HUYEN' | 'SAC' | 'HOI' | 'NGA' | 'NANG'

export const TONES: readonly Tone[] = ['NGANG', 'HUYEN', 'SAC', 'HOI', 'NGA', 'NANG']

/** Dấu kết hợp Unicode của từng thanh (NGANG không có). */
const COMBINING: Record<Exclude<Tone, 'NGANG'>, string> = {
  HUYEN: '̀',
  SAC: '́',
  HOI: '̉',
  NGA: '̃',
  NANG: '̣',
}

export const TONE_LABEL: Record<Tone, string> = {
  NGANG: 'không dấu',
  HUYEN: 'huyền (`)',
  SAC: 'sắc (´)',
  HOI: 'hỏi (?)',
  NGA: 'ngã (~)',
  NANG: 'nặng (.)',
}

/** Kiểu đặt dấu ở oa, oe, uy: `modern` = hòa, khỏe, thủy (chữ cái thứ nhất); `traditional` = hoà, khoẻ, thuỷ (chữ cái thứ hai). */
export type ToneStyle = 'modern' | 'traditional'
export const DEFAULT_TONE_STYLE: ToneStyle = 'modern'

const VOWELS = 'aăâeêioôơuưy'
/** Nguyên âm mang dấu phụ (mũ, móc, trăng): dấu thanh ưu tiên ở đây. */
const QUALITY_VOWELS = 'ăâêôơư'
const FINAL_STOPS = ['c', 'ch', 'p', 't']
/** Cụm mà kiểu cũ đặt dấu ở chữ thứ hai. */
const SECOND_LETTER_PAIRS = ['oa', 'oe', 'uy']

const isVowel = (ch: string) => VOWELS.includes(ch)

export interface SyllableParts {
  /** Âm đầu; chuỗi rỗng nghĩa là không có âm đầu (ví dụ «ao»). */
  onset: string
  /** Vần viết thường, chưa có dấu thanh (có thể có dấu phụ như â, ơ). */
  rhyme: string
  tone: Tone
}

const nfc = (text: string) => text.normalize('NFC')

/** Tách vần thành dãy nguyên âm liên tiếp đầu tiên và phần âm cuối. */
function splitRhyme(rhyme: string): { vowels: string[]; final: string } | null {
  const chars = [...nfc(rhyme)]
  const start = chars.findIndex(isVowel)
  if (start !== 0) return null
  let end = 0
  while (end < chars.length && isVowel(chars[end])) end += 1
  return { vowels: chars.slice(0, end), final: chars.slice(end).join('') }
}

/** Chỉ số (trong dãy nguyên âm của vần) của chữ cái mang dấu thanh. */
function toneIndex(vowels: string[], hasFinal: boolean, style: ToneStyle): number {
  const quality = vowels.map((v, i) => (QUALITY_VOWELS.includes(v) ? i : -1)).filter((i) => i >= 0)
  if (quality.length > 0) return quality[quality.length - 1] // ươ → ơ; iê, uô → ê, ô
  if (hasFinal || vowels.length === 1) return vowels.length - 1
  if (vowels.length >= 3) return 1
  const pair = vowels.join('')
  return style === 'traditional' && SECOND_LETTER_PAIRS.includes(pair) ? 1 : 0
}

/** Đặt dấu thanh lên đúng chữ cái của vần; trả `null` nếu vần không hợp lệ (không bắt đầu bằng nguyên âm). */
export function applyTone(rhyme: string, tone: Tone, style: ToneStyle = DEFAULT_TONE_STYLE): string | null {
  const parts = splitRhyme(rhyme)
  if (!parts) return null
  if (tone === 'NGANG') return nfc(rhyme)
  const index = toneIndex(parts.vowels, parts.final.length > 0, style)
  const marked = nfc(parts.vowels[index].normalize('NFD') + COMBINING[tone])
  const vowels = parts.vowels.map((v, i) => (i === index ? marked : v))
  return nfc(vowels.join('') + parts.final)
}

/**
 * Ghép âm đầu, vần và dấu thanh thành một tiếng (NFC). `null` nếu vần không hợp lệ.
 * Âm đầu «gi» đứng trước vần bắt đầu bằng «i» thì chỉ viết một chữ i (gì, gia), không phải «gii».
 */
export function composeSyllable(parts: SyllableParts, style: ToneStyle = DEFAULT_TONE_STYLE): string | null {
  const withTone = applyTone(parts.rhyme, parts.tone, style)
  if (withTone === null) return null
  const startsWithI = withTone.normalize('NFD')[0] === 'i'
  return nfc((parts.onset === 'gi' && startsWithI ? 'g' : parts.onset) + withTone)
}

/** Mọi tiếng viết khác nhau chỉ ở dạng chuẩn hóa Unicode vẫn là một tiếng: so sánh sau NFC, không phân biệt hoa thường. */
export function sameSyllable(a: string, b: string): boolean {
  return nfc(a).toLowerCase() === nfc(b).toLowerCase()
}

export type SpellingProblem =
  | 'USE_K'
  | 'USE_C'
  | 'USE_GH'
  | 'USE_G'
  | 'USE_NGH'
  | 'USE_NG'
  | 'USE_QU'
  | 'STOP_FINAL_TONE'
  | 'BAD_RHYME'

export const SPELLING_HINT: Record<SpellingProblem, string> = {
  USE_K: 'Trước i, e, ê, y ta viết k, không viết c.',
  USE_C: 'Trước a, o, ô, ơ, u, ư ta viết c, không viết k.',
  USE_GH: 'Trước i, e, ê ta viết gh, không viết g.',
  USE_G: 'Trước a, o, ô, ơ, u, ư ta viết g, không viết gh.',
  USE_NGH: 'Trước i, e, ê ta viết ngh, không viết ng.',
  USE_NG: 'Trước a, o, ô, ơ, u, ư ta viết ng, không viết ngh.',
  USE_QU: 'Âm «q» luôn đi cùng «u»: viết qu.',
  STOP_FINAL_TONE: 'Tiếng kết thúc bằng c, ch, p, t chỉ có dấu sắc hoặc dấu nặng (không để trống dấu).',
  BAD_RHYME: 'Vần này chưa đúng.',
}

const startsFront = (rhyme: string, withY: boolean) => /^(i|e|ê)/.test(rhyme) || (withY && rhyme.startsWith('y'))

/** Luật chính tả đơn giản (c/k, g/gh, ng/ngh, q/qu, thanh với âm cuối c, ch, p, t). `null` = không vi phạm luật nào. Âm đầu «gi» không có luật riêng. */
export function spellingProblem({ onset, rhyme, tone }: SyllableParts): SpellingProblem | null {
  const parts = splitRhyme(rhyme)
  if (!parts) return 'BAD_RHYME'
  const front = startsFront(nfc(rhyme), false)
  const frontK = startsFront(nfc(rhyme), true)
  if (onset === 'q') return 'USE_QU'
  if (onset === 'c' && frontK) return 'USE_K'
  if (onset === 'k' && !frontK) return 'USE_C'
  if (onset === 'g' && front) return 'USE_GH'
  if (onset === 'gh' && !front) return 'USE_G'
  if (onset === 'ng' && front) return 'USE_NGH'
  if (onset === 'ngh' && !front) return 'USE_NG'
  if (FINAL_STOPS.includes(parts.final) && tone !== 'SAC' && tone !== 'NANG') return 'STOP_FINAL_TONE'
  return null
}

/**
 * Tập tiếng nhỏ cho lớp 1 làm từ điển kiểm tra («có phải tiếng thật không»). Lưu dạng thành phần để không phụ thuộc
 * cách đặt dấu thanh. Chỉ khoảng vài chục tiếng, KHÔNG phải từ điển tiếng Việt.
 */
const LEXICON: ReadonlyArray<readonly [onset: string, rhyme: string, tone: Tone]> = [
  ['', 'ao', 'NGANG'], ['b', 'a', 'NGANG'], ['b', 'a', 'HUYEN'], ['b', 'e', 'SAC'], ['b', 'ô', 'SAC'], ['b', 'o', 'HUYEN'],
  ['c', 'a', 'SAC'], ['c', 'a', 'HUYEN'], ['c', 'ô', 'NGANG'], ['c', 'ơ', 'HUYEN'], ['ch', 'o', 'SAC'],
  ['d', 'a', 'NGANG'], ['d', 'ê', 'NGANG'], ['đ', 'i', 'NGANG'], ['đ', 'a', 'SAC'], ['g', 'a', 'HUYEN'],
  ['gh', 'ê', 'SAC'], ['h', 'oa', 'NGANG'], ['h', 'oa', 'HUYEN'], ['h', 'ô', 'HOI'], ['kh', 'oe', 'HOI'],
  ['k', 'ê', 'NGANG'], ['k', 'i', 'HUYEN'], ['l', 'a', 'SAC'], ['m', 'eo', 'HUYEN'], ['m', 'e', 'NANG'],
  ['m', 'ưa', 'NGANG'], ['m', 'ua', 'HUYEN'], ['ng', 'a', 'HUYEN'], ['ng', 'ô', 'NGANG'], ['ngh', 'i', 'HOI'],
  ['ngh', 'e', 'SAC'], ['nh', 'a', 'HUYEN'], ['ph', 'ô', 'SAC'], ['qu', 'a', 'HOI'], ['qu', 'a', 'NANG'],
  ['s', 'ach', 'SAC'], ['t', 'ai', 'NGANG'], ['th', 'o', 'HOI'], ['th', 'uy', 'HOI'], ['tr', 'ăng', 'NGANG'],
  ['v', 'oi', 'NGANG'], ['v', 'ơ', 'HOI'], ['x', 'e', 'NGANG'],
]

export const LEXICON_PARTS: readonly SyllableParts[] = LEXICON.map(([onset, rhyme, tone]) => ({ onset, rhyme, tone }))

/** Tiếng có trong tập từ điển nhỏ này không (so sau NFC, theo kiểu đặt dấu đã chọn). */
export function isKnownSyllable(syllable: string, style: ToneStyle = DEFAULT_TONE_STYLE): boolean {
  return LEXICON_PARTS.some((parts) => {
    const composed = composeSyllable(parts, style)
    return composed !== null && sameSyllable(composed, syllable)
  })
}
