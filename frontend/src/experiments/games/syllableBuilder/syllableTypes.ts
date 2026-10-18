import type { Tone, ToneStyle } from './vietnameseSyllable'

/**
 * SYLLABLE_BUILDER (Tiếng Việt): ghép âm đầu + vần + dấu thanh thành một tiếng. Loại game THỬ NGHIỆM: không thuộc
 * DSL 1.0.0 (đang đóng băng); chỉ sống trong `experiments/` với dữ liệu mẫu cục bộ.
 */
export interface SyllableBuilderQuestion {
  id: string
  /** Yêu cầu hoặc gợi ý nghĩa, ví dụ "Ghép tiếng chỉ con vật kêu meo meo". Không chứa chính tiếng đáp án. */
  questionText: string
  audioText?: string
  audioUrl?: string
  /** Các lựa chọn của từng ô; `''` ở `onsets` nghĩa là không có âm đầu. Mỗi ô 1 đến 8 lựa chọn, không trùng. */
  onsets: string[]
  /** Vần viết thường, chưa có dấu thanh, bắt đầu bằng nguyên âm (ví dụ `oa`, `ươ`, `ach`). */
  rhymes: string[]
  tones: Tone[]
  /** Tiếng đáp án (có dấu thanh). Chuẩn hóa NFC khi so sánh. Dạng học sinh KHÔNG có trường này. */
  target: string
  /** Kiểu đặt dấu ở oa, oe, uy; mặc định `modern` (hòa). Chưa được chuyên gia ngôn ngữ xác nhận. */
  toneStyle?: ToneStyle
}

/**
 * Dạng gửi học sinh: không lộ đáp án (Backend chấm). `audioText` cũng bỏ: ở game này lời đọc chính là tiếng đáp án,
 * học sinh chỉ nhận `audioUrl` (âm thanh đã sinh sẵn).
 */
export type SyllableBuilderStudentQuestion = Omit<SyllableBuilderQuestion, 'target' | 'audioText'>

/** Kết quả chấm của chế độ `play`: có `correctSyllable` thì renderer chỉ luôn tiếng đúng để trẻ học. */
export interface SyllableAnswerResult {
  isCorrect: boolean
  correctSyllable?: string
}

/** Ba ô chọn. */
export type SyllableSlot = 'onset' | 'rhyme' | 'tone'
export const SYLLABLE_SLOTS: readonly SyllableSlot[] = ['onset', 'rhyme', 'tone']

/** Chỉ số lựa chọn đang chọn ở từng ô. */
export interface SyllableSelection {
  onset: number
  rhyme: number
  tone: number
}
