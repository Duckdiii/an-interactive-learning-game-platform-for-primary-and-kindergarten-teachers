// Hình hóa nội dung lựa chọn mà không đổi contract DSL: đọc chữ đáp án để biết nên vẽ vật gì (hàm thuần, có test).
import type { PresentationCarrier } from '../../types/game-dsl.types'
import { findCatalogItemsInText } from '../../utils/assetResolver'
import type { ColorWord } from './palette'

/** Vật đại diện cho lựa chọn theo thế giới game: bóng bay (mặc định), bong bóng nước (đại dương), hành tinh (vũ trụ). */
export type OptionObjectKind = PresentationCarrier

export function objectKindForTheme(themeId: string | undefined): OptionObjectKind {
  if (themeId === 'ocean') return 'bubble'
  if (themeId === 'space' || themeId === 'owl') return 'planet'
  return 'balloon'
}

// Giữ dấu khi so (không dùng normalizeKeyword): bỏ dấu thì "cam" (màu) lẫn với "cảm", "đen" với "đèn".
const COLOR_WORDS: ReadonlyArray<[readonly string[], ColorWord]> = [
  [['xanh dương', 'xanh da trời', 'xanh nước biển', 'blue'], 'blue'],
  [['xanh lá cây', 'xanh lá', 'green'], 'green'],
  [['đỏ', 'red'], 'red'],
  [['vàng', 'yellow'], 'yellow'],
  [['cam', 'orange'], 'orange'],
  [['tím', 'purple', 'violet'], 'purple'],
  [['hồng', 'pink'], 'pink'],
  [['nâu', 'brown'], 'brown'],
  [['đen', 'black'], 'black'],
  [['trắng', 'white'], 'white'],
]

/**
 * Lựa chọn CHỈ là tên một màu ("Red", "màu đỏ", "Màu sắc: vàng") thì trả màu đó để tô vật, thay vì chỉ ghi chữ (trẻ mầm non chưa đọc được).
 * Có thêm chữ khác ("Con mèo đen", "quả cam", "Red apple") thì không tính: đó là tên vật, tô theo màu sẽ gây hiểu nhầm.
 * "xanh" đứng riêng bỏ qua vì không rõ xanh lá hay xanh dương.
 */
export function colorWordOf(text: string): ColorWord | null {
  const normalized = text
    .normalize('NFC')
    .toLowerCase()
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(màu sắc|màu|the colou?r|colou?r)\s+/u, '')
  return COLOR_WORDS.find(([words]) => words.includes(normalized))?.[1] ?? null
}

/** Số lượng tối đa vẽ thành hình (nhiều hơn thì chật ô và trẻ khó đếm). */
export const MAX_PICTURE_COUNT = 10

/**
 * "3 con vịt", "5 quả táo" → vẽ 3 con vịt, 5 quả táo để trẻ đếm. Chỉ nhận khi danh từ khớp một hình trong kho theo từ khóa
 * (không nhận chữ cái lẻ hay đơn vị đo: "50 m", "3 kg" bỏ qua). Trả `null` khi không hình hóa được.
 */
export function quantityPicture(text: string): { count: number; imageUrl: string } | null {
  const match = text.normalize('NFC').trim().match(/^(\d{1,2})\s+(.+)$/u)
  if (!match) return null
  const count = Number(match[1])
  if (count < 1 || count > MAX_PICTURE_COUNT) return null
  const item = findCatalogItemsInText(match[2]).find((candidate) => candidate.category !== 'numbers')
  return item ? { count, imageUrl: item.url } : null
}

/**
 * Số hình cần vẽ cho ảnh minh họa câu hỏi: mô tả "3 con vịt vàng…" mà ảnh đúng là hình tự động của con vịt thì vẽ 3 con
 * để trẻ đếm được. Ảnh giáo viên tự đặt (khác hình tự động) hoặc mô tả không có số thì vẽ một lần.
 */
export function illustrationCount(visualPrompt: string | undefined, imageUrl: string | undefined): number {
  if (!visualPrompt || !imageUrl) return 1
  const picture = quantityPicture(visualPrompt)
  return picture && picture.imageUrl === imageUrl ? picture.count : 1
}

/**
 * Lựa chọn là một tấm thẻ chữ ("Thẻ chữ bàn", "thẻ từ quả bóng", hoặc "chữ khăn" với đúng một từ): trả lại chữ cần hiện;
 * không phải thì null. Thẻ chữ phải hiện đúng chữ, không được thay bằng một hình đoán theo từ khóa. Không nhận "Tiếng chuông
 * reo", "Chữ cái A", "Từ điển": đó là mô tả hình/âm thanh, không phải thẻ chữ.
 */
export function wordCardText(visualPrompt: string | undefined): string | null {
  const text = visualPrompt?.normalize('NFC').trim() ?? ''
  const clean = (word: string) => word.replace(/^["'“”]|["'“”.]$/gu, '').trim() || null
  const card = text.match(/^(?:tấm\s+)?thẻ\s+(?:chữ|từ|tiếng)\s+(.+)$/iu)
  if (card) return clean(card[1])
  const bare = text.match(/^chữ\s+(["'“]?[\p{L}]+["'”.]?)$/iu)
  return bare && bare[1].toLowerCase() !== 'cái' ? clean(bare[1]) : null
}

/** Một hình minh họa cho lựa chọn chỉ có tên vật ("Con mèo", "apple"), không kèm số. */
export function singlePicture(text: string): string | null {
  if (/\d/.test(text) || text.trim().split(/\s+/).length > 4) return null
  return findCatalogItemsInText(text).find((candidate) => candidate.category !== 'numbers')?.url ?? null
}
