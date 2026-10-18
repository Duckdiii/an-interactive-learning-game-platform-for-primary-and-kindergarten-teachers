import type { SyllableBuilderQuestion } from './syllableTypes'

/** Dữ liệu mẫu cục bộ của SYLLABLE_BUILDER (không gọi mạng). Mọi mẫu đều hợp lệ theo `validateSyllableBuilder`. */
export const mockSyllableMeo: SyllableBuilderQuestion = {
  id: 'syl-meo',
  questionText: 'Ghép tiếng chỉ con vật kêu «meo meo»',
  onsets: ['m', 'n', 'b'],
  rhymes: ['eo', 'a', 'ao'],
  tones: ['NGANG', 'HUYEN', 'SAC'],
  target: 'mèo',
}

/** Tiếng có oa: cần chọn kiểu đặt dấu (hòa theo kiểu hiện đại). */
export const mockSyllableHoa: SyllableBuilderQuestion = {
  id: 'syl-hoa',
  questionText: 'Ghép tiếng có nghĩa là yên ổn, không đánh nhau',
  onsets: ['h', 'kh', 'th'],
  rhymes: ['oa', 'oe', 'uy'],
  tones: ['NGANG', 'HUYEN', 'HOI'],
  target: 'hòa',
}

/** Luật c/k: «kê» viết k vì đứng trước ê. */
export const mockSyllableKe: SyllableBuilderQuestion = {
  id: 'syl-ke',
  questionText: 'Ghép tiếng chỉ loại hạt nhỏ màu vàng, hay cho chim ăn',
  onsets: ['c', 'k', 'g'],
  rhymes: ['ê', 'a', 'ô'],
  tones: ['NGANG', 'SAC'],
  target: 'kê',
}

/** Âm cuối ch: chỉ nhận sắc hoặc nặng. */
export const mockSyllableSach: SyllableBuilderQuestion = {
  id: 'syl-sach',
  questionText: 'Ghép tiếng chỉ vật em mở ra đọc mỗi ngày',
  onsets: ['s', 'x', 'th'],
  rhymes: ['ach', 'a', 'ăng'],
  tones: ['NGANG', 'HUYEN', 'SAC', 'NANG'],
  target: 'sách',
}

export const mockSyllableWithAudio: SyllableBuilderQuestion = {
  ...mockSyllableMeo,
  id: 'syl-audio',
  audioText: 'mèo',
  audioUrl: '/mock/q1.wav',
}

/** Không âm đầu: «ao» là tiếng không có âm đầu. */
export const mockSyllableNoOnset: SyllableBuilderQuestion = {
  id: 'syl-ao',
  questionText: 'Ghép tiếng chỉ nơi cá bơi',
  onsets: ['', 'b', 'tr'],
  rhymes: ['ao', 'a', 'ơ'],
  tones: ['NGANG', 'HUYEN', 'SAC'],
  target: 'ao',
}

export const SYLLABLE_FIXTURES = {
  'mèo (c/m/eo)': mockSyllableMeo,
  'hòa (oa, kiểu đặt dấu)': mockSyllableHoa,
  'kê (c hay k)': mockSyllableKe,
  'sách (âm cuối ch)': mockSyllableSach,
  'ao (không âm đầu)': mockSyllableNoOnset,
  'Có nút nghe lại': mockSyllableWithAudio,
} as const
