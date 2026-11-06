/**
 * Prompt Completeness Assessor (Giai đoạn B)
 *
 * Đánh giá độ đầy đủ sư phạm của prompt (CoT Reasoning & Interactive Clarification).
 * Nhận diện prompt mơ hồ hoặc quá ngắn (< 15 ký tự, thiếu phạm vi / dạng bài)
 * và đưa ra các câu hỏi định hướng 1-Click:
 * 1. Mục tiêu kỹ năng trọng tâm (Skill / Operation)
 * 2. Thế giới bối cảnh trực quan (Visual Theme)
 * 3. Mức độ nhận thức theo Bloom (Bloom Cognitive Level)
 */

import { parsePedagogicalConstraints } from './constraintParser'

export interface ClarificationOption {
  id: string
  label: string
  description?: string
  patchPrompt: string // chuỗi bổ sung vào prompt (vd: "phép cộng có nhớ trong phạm vi 100")
}

export interface ClarificationQuestion {
  id: string
  title: string
  reasoning: string // Lý do sư phạm AI đưa ra câu hỏi này
  options: ClarificationOption[]
  selectedOptionId?: string
}

export interface CompletenessAssessment {
  score: number // từ 0 đến 100
  isComplete: boolean // >= 75 là đủ, < 75 là cần làm rõ
  summary: string // Tóm tắt nhận định của AI
  questions: ClarificationQuestion[] // 2-3 câu hỏi làm rõ nếu thiếu thông tin
}

/**
 * Các bộ tùy chọn chuẩn theo quy định sư phạm K-5
 */
const THEME_OPTIONS: ClarificationOption[] = [
  { id: 'theme-farm', label: '🌾 Nông trại vui vẻ', patchPrompt: 'trong bối cảnh nông trại vui vẻ' },
  { id: 'theme-ocean', label: '🌊 Đại dương kỳ thú', patchPrompt: 'trong bối cảnh đại dương kỳ thú' },
  { id: 'theme-jungle', label: '🌴 Rừng xanh thám hiểm', patchPrompt: 'trong bối cảnh rừng xanh thám hiểm' },
  { id: 'theme-space', label: '🚀 Du hành vũ trụ', patchPrompt: 'trong bối cảnh du hành vũ trụ' },
]

const BLOOM_OPTIONS: ClarificationOption[] = [
  {
    id: 'bloom-remember',
    label: '🌱 Nhận biết - Dễ',
    description: 'Nhận diện trực quan, câu hỏi cơ bản',
    patchPrompt: 'mức độ nhận biết dễ',
  },
  {
    id: 'bloom-understand',
    label: '🌿 Thông hiểu - Vừa',
    description: 'Hiểu bản chất, tính toán vừa sức',
    patchPrompt: 'mức độ thông hiểu vừa sức',
  },
  {
    id: 'bloom-apply',
    label: '🌳 Vận dụng - Thử thách',
    description: 'Bài toán logic hoặc tương tác phản xạ nhanh',
    patchPrompt: 'mức độ vận dụng thử thách',
  },
]

/**
 * Sinh câu hỏi kỹ năng toán học theo khối lớp
 */
function getMathSkillOptions(gradeLevel: number): ClarificationOption[] {
  if (gradeLevel <= 1) {
    return [
      { id: 'math-g1-10', label: 'Phép cộng trừ trong phạm vi 10', patchPrompt: 'phép cộng trừ trong phạm vi 10' },
      { id: 'math-g1-20', label: 'Phép cộng trừ trong phạm vi 20', patchPrompt: 'phép cộng trừ trong phạm vi 20' },
      { id: 'math-g1-count', label: 'Đếm và so sánh số lượng', patchPrompt: 'đếm và so sánh số lượng' },
    ]
  }

  if (gradeLevel === 2) {
    return [
      { id: 'math-g2-add-100', label: 'Phép cộng có nhớ phạm vi 100', patchPrompt: 'phép cộng có nhớ trong phạm vi 100' },
      { id: 'math-g2-sub-100', label: 'Phép trừ có nhớ phạm vi 100', patchPrompt: 'phép trừ có nhớ trong phạm vi 100' },
      { id: 'math-g2-parity', label: 'Số chẵn và số lẻ', patchPrompt: 'nhận biết số chẵn và số lẻ' },
    ]
  }

  // Khối 3-5
  return [
    { id: 'math-g3-mul-div', label: 'Bảng nhân bảng chia', patchPrompt: 'bảng nhân và bảng chia' },
    { id: 'math-g3-calc-1000', label: 'Phép tính phạm vi 1000', patchPrompt: 'phép tính trong phạm vi 1000' },
    { id: 'math-g3-add-sub-100', label: 'Phép cộng trừ phạm vi 100', patchPrompt: 'phép cộng trừ trong phạm vi 100' },
  ]
}

/**
 * Sinh câu hỏi kỹ năng Tiếng Việt
 */
function getVietnameseSkillOptions(): ClarificationOption[] {
  return [
    {
      id: 'viet-consonants',
      label: 'Phân biệt âm đầu (l/n, s/x, d/đ)',
      patchPrompt: 'phân biệt âm đầu l và n',
    },
    {
      id: 'viet-tones',
      label: 'Luyện tập dấu thanh (hỏi/ngã)',
      patchPrompt: 'phân biệt dấu hỏi và dấu ngã',
    },
    {
      id: 'viet-vocab',
      label: 'Mở rộng vốn từ theo chủ điểm',
      patchPrompt: 'mở rộng vốn từ ngữ quen thuộc',
    },
  ]
}

/**
 * Đánh giá độ đầy đủ sư phạm của prompt (CoT Assessment)
 */
export function assessPromptCompleteness(
  prompt: string,
  rawGradeLevel?: string,
  rawSubject?: string
): CompletenessAssessment {
  const trimmed = prompt.trim()
  const lower = trimmed.toLowerCase()

  // 1. Phân tích ràng buộc qua constraintParser
  const constraints = parsePedagogicalConstraints(`${trimmed} ${rawSubject ?? ''} ${rawGradeLevel ?? ''}`)

  const effectiveSubject = constraints.subject || (rawSubject === 'VIETNAMESE' ? 'VIETNAMESE' : 'MATH')
  const effectiveGrade = constraints.gradeLevel || 2

  // 2. Kiểm tra các chỉ dấu cụ thể về sư phạm
  const hasSpecificMathSkill =
    Boolean(constraints.mathType && constraints.mathType !== 'COUNT') ||
    Boolean(constraints.hasRegrouping) ||
    /cộng|trừ|nhân|chia|so sánh|chẵn|lẻ|bảng cửu chương|bảng nhân|bảng chia|đếm/.test(lower)

  const hasSpecificVietSkill =
    Boolean(constraints.languageConcept && constraints.languageConcept.type !== 'LETTER') ||
    /âm đầu|dấu thanh|chính tả|vần|tập đọc|ghép chữ|hỏi.*ngã|l.*n|s.*x|chữ cái/.test(lower)

  const hasSpecificEnglishSkill =
    effectiveSubject === 'ENGLISH' ||
    /từ vựng|tiếng anh|english|vocabulary/.test(lower)

  const hasSpecificSkill =
    hasSpecificMathSkill ||
    hasSpecificVietSkill ||
    hasSpecificEnglishSkill ||
    /đếm|con vật|hoa quả|động vật|chữ cái/.test(lower)

  const hasSpecificTheme =
    /nông trại|trang trại|đại dương|biển|rừng|vũ trụ|không gian|space|farm|ocean|jungle|con vật|động vật|hoa quả|trái cây|gia đình|trường học/.test(lower)

  const hasRange = Boolean(constraints.rangeMax) && constraints.rangeMax !== 100

  // 3. Tính điểm độ đầy đủ (Score 0 - 100)
  // Các trường hợp prompt quá ngắn (< 15 ký tự) hoặc quá chung chung ("bài tập nông trại", "toán lớp 2")
  const isTooShort = trimmed.length < 15
  const isVagueGeneral =
    /^(toán|toán học|tiếng việt|khoa học|tiếng anh|bài tập|ôn tập|luyện tập|trò chơi)(\s+lớp\s+[1-5])?$/i.test(lower) ||
    /^(bài tập|trò chơi)\s+(nông trại|đại dương|rừng xanh|vũ trụ)$/i.test(lower)

  let score = 50

  if (isTooShort || isVagueGeneral) {
    score = Math.min(45, Math.max(20, trimmed.length * 3))
  } else {
    // Có độ dài >= 15
    score = 70
    if (hasSpecificSkill) score += 15
    if (hasSpecificTheme) score += 10
    if (hasRange) score += 5
  }

  // Ngưỡng đạt chuẩn sư phạm là 75 điểm
  const isComplete = score >= 75 && !isTooShort && !isVagueGeneral

  if (isComplete) {
    return {
      score: Math.min(100, Math.max(80, score)),
      isComplete: true,
      summary: 'Mô tả bài học đã đầy đủ mục tiêu sư phạm và bối cảnh trực quan.',
      questions: [],
    }
  }

  // 4. Nếu thiếu thông tin: Xây dựng 2 - 3 câu hỏi làm rõ
  const questions: ClarificationQuestion[] = []

  // Câu hỏi 1: Mục tiêu kỹ năng
  if (effectiveSubject === 'VIETNAMESE') {
    questions.push({
      id: 'skill',
      title: 'Mục tiêu kỹ năng Tiếng Việt',
      reasoning: 'Lựa chọn dạng ngữ âm trọng tâm giúp AI sinh từ vựng và cặp thẻ chính xác.',
      options: getVietnameseSkillOptions(),
      selectedOptionId: getVietnameseSkillOptions()[0].id,
    })
  } else {
    questions.push({
      id: 'skill',
      title: `Mục tiêu kỹ năng Toán (Lớp ${effectiveGrade})`,
      reasoning: 'Xác định dạng phép tính và phạm vi số giúp AI sinh bộ số chuẩn sư phạm 0% ảo giác.',
      options: getMathSkillOptions(effectiveGrade),
      selectedOptionId: getMathSkillOptions(effectiveGrade)[0].id,
    })
  }

  // Câu hỏi 2: Thế giới bối cảnh trực quan
  questions.push({
    id: 'theme',
    title: 'Thế giới bối cảnh trực quan',
    reasoning: 'Linh vật mascot và thế giới đồ họa hoạt hình kích thích trí tò mò của trẻ K-5.',
    options: THEME_OPTIONS,
    selectedOptionId: THEME_OPTIONS[0].id,
  })

  // Câu hỏi 3: Mức độ nhận thức theo Bloom
  questions.push({
    id: 'bloom',
    title: 'Mức độ nhận thức theo Bloom',
    reasoning: 'Thiết lập độ khó và tính phân hóa sư phạm cho bài học.',
    options: BLOOM_OPTIONS,
    selectedOptionId: BLOOM_OPTIONS[0].id,
  })

  return {
    score,
    isComplete: false,
    summary: 'Mô tả bài học còn ngắn hoặc thiếu phạm vi cụ thể. Thầy/Cô hãy chọn nhanh các định hướng dưới đây:',
    questions,
  }
}

/**
 * Hàm tổng hợp Enriched Prompt từ prompt gốc và các patch đã chọn
 */
export function buildEnrichedPrompt(
  originalPrompt: string,
  selectedPatches: string[]
): string {
  const base = originalPrompt.trim()
  const validPatches = selectedPatches.map((p) => p.trim()).filter(Boolean)
  if (validPatches.length === 0) return base
  if (!base) return validPatches.join(', ')

  const additions: string[] = []
  const lowerBase = base.toLowerCase()

  for (const patch of validPatches) {
    const lowerPatch = patch.toLowerCase()
    // Tránh lặp lại nếu từ khóa chính trong patch đã xuất hiện rõ ràng trong base
    if (!lowerBase.includes(lowerPatch)) {
      additions.push(patch)
    }
  }

  if (additions.length === 0) return base

  return `${base} (${additions.join(', ')})`
}
