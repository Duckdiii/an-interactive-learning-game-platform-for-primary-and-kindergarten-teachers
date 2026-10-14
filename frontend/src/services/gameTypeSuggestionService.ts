import type { GameTypeSuggestion, SuggestGameTypesInput } from '../types/game-suggestion.types'
import { hasPhrase, toMatchText } from '../utils/phraseMatch'

// LUÔN LÀ MÔ PHỎNG: contract (`openapi.yaml`) chưa có endpoint đề xuất loại game, nên hàm này không đi qua cờ `ai` và nhãn
// "Dữ liệu mô phỏng" ở bước đề xuất luôn hiện. Khi backend có endpoint, thêm nhánh gọi thật dưới cờ `ai`.
// MOCK: đề xuất loại game theo MỤC TIÊU HỌC của ý tưởng. Khi có endpoint AI thật, chỉ thay thân hàm `suggestGameTypes`
// (giữ nguyên chữ ký và kiểu trả về); hook và giao diện không phải sửa.
//
// Cách làm: nhận ra mục tiêu học từ ý tưởng (đếm, nhận biết chữ cái, phân loại, ghi nhớ, sắp xếp), rồi tra bảng
// "mục tiêu x loại game". Mỗi ô của bảng có `fitScore` và câu lý do RIÊNG viết cho đúng cặp đó (không ghép từ khóa vào
// câu mẫu). Ý tưởng không nhận ra mục tiêu nào thì dùng bảng chung.
export const SUGGESTION_MAX = 5
// Loại có điểm thấp hơn ngưỡng này bị ẩn (không đáng để gợi ý).
export const MIN_FIT_SCORE = 0.3
// Chỉ gắn nhãn "Phù hợp nhất" khi thẻ đầu thật sự phù hợp, không phải do thứ tự khai báo.
export const TOP_FIT_SCORE = 0.7
export const MOCK_LATENCY_MS = 1000

export type LearningGoal = 'COUNTING' | 'LETTERS' | 'SPELLING' | 'CLASSIFY' | 'MEMORY' | 'ORDERING' | 'GENERAL'

// Từ khóa là cụm đủ nghĩa (tránh từ đơn như "nhóm", "ôn tập" vì hay xuất hiện ở bài không liên quan: "làm việc nhóm").
const GOAL_KEYWORDS: ReadonlyArray<[Exclude<LearningGoal, 'GENERAL'>, ReadonlyArray<string>]> = [
  ['COUNTING', ['dem so', 'dem den', 'dem tu', 'dem cac', 'dem hinh', 'dem do vat', 'dem con vat', 'so luong', 'chu so', 'nhan biet so']],
  ['LETTERS', ['chu cai', 'bang chu cai', 'hoc van', 'tap doc']],
  ['SPELLING', ['ghep van', 'ghep chu', 'sap xep chu', 'xao tron chu', 'chinh ta']],
  ['CLASSIFY', ['phan loai', 'phan nhom', 'chia theo nhom', 'theo nhom', 'khac loai', 'phan biet nhom']],
  ['MEMORY', ['ghi nho', 'tu vung', 'nho lai']],
  ['ORDERING', ['sap xep', 'thu tu', 'lon be', 'truoc sau', 'xep theo']],
]

// "Sắp xếp chữ cái thành từ" là xếp CHỮ (loại Sắp xếp chữ cái), không phải xếp thứ tự: nếu có các cụm này thì bỏ mục tiêu
// ORDERING dù "sắp xếp" cũng khớp.
const SUPPRESS_ORDERING = ['ghep chu', 'sap xep chu', 'xao tron chu']

/** Nhận ra các mục tiêu học có trong ý tưởng (thuần, dễ test). Không có thì trả ['GENERAL']. */
export function detectGoals(idea: string): LearningGoal[] {
  const text = toMatchText(idea)
  const scrambling = SUPPRESS_ORDERING.some((phrase) => hasPhrase(text, phrase))
  const goals = GOAL_KEYWORDS.filter(
    ([goal, keywords]) => !(scrambling && goal === 'ORDERING') && keywords.some((keyword) => hasPhrase(text, keyword)),
  ).map(([goal]) => goal)

  return goals.length > 0 ? goals : ['GENERAL']
}

export const DESCRIPTIONS: Readonly<Record<string, string>> = {
  QUIZ: 'Bé đọc câu hỏi rồi chọn một đáp án đúng trong vài lựa chọn.',
  AUDIO_VISUAL_MATCH: 'Bé nghe âm thanh hoặc lời đọc rồi chọn hình đúng.',
  ODD_ONE_OUT: 'Bé chọn vật khác loại trong một nhóm.',
  SPOT_THE_TARGET: 'Bé chạm vào đúng vật cần tìm trong một bức tranh.',
  WORD_SCRAMBLE: 'Bé ghép các chữ cái bị xáo trộn thành từ đúng.',
  MATCHING: 'Bé nối mỗi mục bên trái với mục tương ứng bên phải.',
  MEMORY_CARD: 'Bé lật từng cặp thẻ để tìm hai thẻ giống nhau.',
  DRAG_DROP: 'Bé kéo từng vật thả vào đúng nhóm hoặc đúng chỗ.',
  ORDERING: 'Bé sắp xếp các mục theo đúng thứ tự.',
  VISUAL_CLOZE: 'Bé chọn từ hoặc hình còn thiếu để điền vào chỗ trống.',
}

export interface Fit {
  score: number
  reason: string
}

// Bảng mục tiêu x loại game. Ô nào không có nghĩa là loại đó không hợp với mục tiêu (bị ẩn).
export const FIT: Readonly<Record<LearningGoal, Readonly<Record<string, Fit>>>> = {
  COUNTING: {
    MATCHING: { score: 0.95, reason: 'Bé nối nhóm 3 con vật với số 3, rèn quan hệ giữa số lượng và chữ số.' },
    QUIZ: { score: 0.85, reason: 'Bé đếm số con vật trong tranh rồi chọn con số đúng, kiểm tra nhanh khả năng đếm.' },
    DRAG_DROP: { score: 0.75, reason: 'Bé kéo đúng 5 quả bóng vào giỏ, luyện đếm bằng chính thao tác của mình.' },
    AUDIO_VISUAL_MATCH: { score: 0.65, reason: 'Bé nghe đọc "ba" rồi chọn hình có 3 vật, gắn tên số với số lượng.' },
    MEMORY_CARD: { score: 0.6, reason: 'Bé lật thẻ để ghép thẻ có 4 quả táo với thẻ số 4, vừa nhớ vừa nhận ra số lượng.' },
    ORDERING: { score: 0.55, reason: 'Bé xếp các số 1, 2, 3, 4 theo thứ tự tăng dần, củng cố dãy số vừa đếm.' },
    SPOT_THE_TARGET: { score: 0.5, reason: 'Bé chạm vào nhóm có đúng 3 vật trong tranh, luyện nhìn nhanh số lượng nhỏ.' },
    ODD_ONE_OUT: { score: 0.35, reason: 'Bé tìm nhóm có số lượng khác với các nhóm còn lại.' },
    VISUAL_CLOZE: { score: 0.25, reason: 'Bé điền số còn thiếu vào dãy số.' },
  },
  SPELLING: {
    WORD_SCRAMBLE: { score: 0.95, reason: 'Bé sắp xếp các chữ cái bị xáo trộn thành từ "ba", "cá", luyện ghép chữ và nhớ cách viết.' },
    VISUAL_CLOZE: { score: 0.7, reason: 'Bé chọn chữ còn thiếu để điền vào từ (c_), luyện chính tả từng chữ trong từ.' },
    QUIZ: { score: 0.55, reason: 'Bé chọn cách viết đúng của từ trong hai đáp án, kiểm tra nhanh chính tả.' },
    MATCHING: { score: 0.6, reason: 'Bé nối vần với từ có vần đó (ăn với "con trăn"), nhớ vần qua từ quen thuộc.' },
    AUDIO_VISUAL_MATCH: { score: 0.5, reason: 'Bé nghe đọc từ rồi chọn hình, gắn âm đọc với mặt chữ của từ.' },
    MEMORY_CARD: { score: 0.45, reason: 'Bé lật thẻ tìm cặp từ và hình tương ứng, nhớ cách viết từ.' },
  },
  LETTERS: {
    MATCHING: { score: 0.9, reason: 'Bé nối chữ cái "a" với hình con ong, nhớ mặt chữ qua hình ảnh quen thuộc.' },
    WORD_SCRAMBLE: { score: 0.85, reason: 'Bé ghép các chữ bị xáo trộn thành từ "ba", "cá", luyện nhận mặt chữ và thứ tự chữ trong từ.' },
    AUDIO_VISUAL_MATCH: { score: 0.8, reason: 'Bé nghe âm "ă" rồi chọn đúng chữ, gắn âm với mặt chữ.' },
    MEMORY_CARD: { score: 0.75, reason: 'Bé lật thẻ tìm cặp chữ hoa và chữ thường (A và a), nhớ hình dạng từng chữ.' },
    VISUAL_CLOZE: { score: 0.7, reason: 'Bé chọn chữ còn thiếu để điền vào từ (_ à), luyện ghép chữ vào từ.' },
    SPOT_THE_TARGET: { score: 0.65, reason: 'Bé tìm và chạm đúng chữ "ă" giữa nhiều chữ khác, rèn phân biệt các chữ gần giống.' },
    QUIZ: { score: 0.6, reason: 'Bé chọn chữ cái đứng đầu tên con vật trong tranh, kiểm tra nhanh mặt chữ.' },
    ODD_ONE_OUT: { score: 0.5, reason: 'Bé tìm chữ khác loại trong một hàng chữ, phân biệt a, ă, â.' },
    ORDERING: { score: 0.45, reason: 'Bé xếp các chữ cái theo thứ tự trong bảng chữ cái.' },
    DRAG_DROP: { score: 0.4, reason: 'Bé kéo từng chữ vào đúng ô, luyện nhận mặt chữ bằng thao tác.' },
  },
  CLASSIFY: {
    DRAG_DROP: { score: 0.95, reason: 'Bé kéo từng con vật thả vào đúng nhóm (ở nhà, trong rừng, dưới nước), rèn kỹ năng phân loại.' },
    ODD_ONE_OUT: { score: 0.85, reason: 'Bé chọn vật không cùng nhóm với các vật còn lại, hiểu tiêu chí để phân loại.' },
    MATCHING: { score: 0.7, reason: 'Bé nối từng vật với nhóm của nó, ví dụ con cá với nước.' },
    QUIZ: { score: 0.6, reason: 'Bé trả lời "Con vật nào sống dưới nước?", kiểm tra nhanh tiêu chí phân loại.' },
    SPOT_THE_TARGET: { score: 0.55, reason: 'Bé chạm vào tất cả vật thuộc cùng một nhóm trong tranh.' },
    MEMORY_CARD: { score: 0.45, reason: 'Bé lật thẻ ghép con vật với nơi sống của nó.' },
    AUDIO_VISUAL_MATCH: { score: 0.4, reason: 'Bé nghe tên một con vật rồi chọn hình, sau đó nói con vật thuộc nhóm nào.' },
  },
  MEMORY: {
    MEMORY_CARD: { score: 0.95, reason: 'Bé lật từng cặp thẻ để tìm hai thẻ giống nhau, luyện trí nhớ ngắn hạn.' },
    MATCHING: { score: 0.8, reason: 'Bé nối từ hoặc hình với nghĩa của nó, nhắc lại nhiều lần nên dễ nhớ.' },
    AUDIO_VISUAL_MATCH: { score: 0.75, reason: 'Bé nghe một từ rồi chọn hình, nhớ từ qua cả tai và mắt.' },
    QUIZ: { score: 0.7, reason: 'Bé trả lời câu hỏi nhắc lại nội dung vừa học, củng cố trí nhớ.' },
    WORD_SCRAMBLE: { score: 0.55, reason: 'Bé ghép chữ để tạo lại từ đã học, nhớ cách viết.' },
    SPOT_THE_TARGET: { score: 0.4, reason: 'Bé tìm lại vật đã học trong tranh, nhắc lại tên vật.' },
    DRAG_DROP: { score: 0.4, reason: 'Bé kéo từ vào đúng hình đã học.' },
  },
  ORDERING: {
    ORDERING: { score: 0.95, reason: 'Bé xếp các bước hoặc các số theo đúng thứ tự, rèn tư duy trình tự.' },
    DRAG_DROP: { score: 0.7, reason: 'Bé kéo các thẻ vào đúng vị trí 1, 2, 3, luyện thứ tự bằng thao tác.' },
    QUIZ: { score: 0.6, reason: 'Bé chọn đáp án cho "Sau số 4 là số mấy?", kiểm tra nhanh thứ tự.' },
    VISUAL_CLOZE: { score: 0.55, reason: 'Bé điền số còn thiếu vào dãy (1, 2, _, 4), củng cố dãy số.' },
    MATCHING: { score: 0.5, reason: 'Bé nối số thứ tự với vật tương ứng (thứ nhất, thứ hai, thứ ba).' },
    MEMORY_CARD: { score: 0.35, reason: 'Bé lật thẻ và nhớ thứ tự xuất hiện của các thẻ.' },
  },
  GENERAL: {
    QUIZ: { score: 0.6, reason: 'Dạng quen thuộc nhất, giúp kiểm tra nhanh bé đã hiểu bài hay chưa.' },
    MATCHING: { score: 0.5, reason: 'Nối cặp giúp bé liên hệ hai khái niệm trong bài với nhau.' },
    MEMORY_CARD: { score: 0.45, reason: 'Trò chơi trí nhớ vui, bé nào cũng thích lật thẻ.' },
    SPOT_THE_TARGET: { score: 0.4, reason: 'Tìm vật trong tranh rèn khả năng quan sát.' },
    DRAG_DROP: { score: 0.4, reason: 'Bé tự tay kéo thả nên dễ nhớ hơn.' },
    AUDIO_VISUAL_MATCH: { score: 0.35, reason: 'Nghe rồi chọn hình, hợp với bé chưa đọc thạo chữ.' },
    ODD_ONE_OUT: { score: 0.3, reason: 'Tìm vật khác loại rèn khả năng so sánh và phân biệt.' },
  },
}

// Điều chỉnh nhỏ theo môn và khối lớp (không đổi thứ hạng lớn).
function contextBonus(type: string, input: SuggestGameTypesInput) {
  let bonus = 0

  if (input.gradeLevel === 'KINDERGARTEN' && ['MEMORY_CARD', 'SPOT_THE_TARGET', 'MATCHING'].includes(type)) bonus += 0.05
  if (input.subject === 'ENGLISH' && ['AUDIO_VISUAL_MATCH', 'MATCHING'].includes(type)) bonus += 0.1

  return bonus
}

const round = (value: number) => Math.round(Math.min(1, value) * 100) / 100

/**
 * Xếp hạng loại game cho ý tưởng này (thuần, dễ test): điểm cao đứng trước, hòa thì giữ thứ tự khai báo.
 * Mục tiêu nào cho điểm cao nhất với loại game đó thì lấy điểm và câu lý do của mục tiêu ấy. Loại dưới MIN_FIT_SCORE bị
 * ẩn; tối đa SUGGESTION_MAX loại.
 */
export function rankGameTypes(input: SuggestGameTypesInput): GameTypeSuggestion[] {
  const best = new Map<string, Fit>()

  for (const goal of detectGoals(input.idea)) {
    for (const [type, fit] of Object.entries(FIT[goal])) {
      const current = best.get(type)

      if (!current || fit.score > current.score) best.set(type, fit)
    }
  }

  return selectSuggestions(best, input)
}

/** Bước lọc, sắp xếp và cắt (tách riêng để test với bảng điểm tùy ý). */
export function selectSuggestions(best: ReadonlyMap<string, Fit>, input: SuggestGameTypesInput): GameTypeSuggestion[] {
  return [...best.entries()]
    .map(([type, fit], index) => ({ type, fit, index, score: round(fit.score + contextBonus(type, input)) }))
    .filter((item) => item.score >= MIN_FIT_SCORE)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, SUGGESTION_MAX)
    .map(({ type, fit, score }) => ({
      type,
      reason: fit.reason,
      description: DESCRIPTIONS[type] ?? '',
      fitScore: score,
    }))
}

/** MOCK: giả lập độ trễ của lời gọi AI. `latencyMs` để test chạy nhanh. */
export async function suggestGameTypes(
  input: SuggestGameTypesInput,
  latencyMs: number = MOCK_LATENCY_MS,
): Promise<GameTypeSuggestion[]> {
  await new Promise((resolve) => setTimeout(resolve, latencyMs))

  return rankGameTypes(input)
}
