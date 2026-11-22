/**
 * Pedagogical Constraint Parser (Chặng 1 & Giai đoạn A)
 *
 * Phân tích và bóc tách các ràng buộc sư phạm động từ câu lệnh tự nhiên (natural prompt)
 * của giáo viên:
 * - Môn học (Toán, Tiếng Việt, Khoa học, Tiếng Anh)
 * - Khối lớp (1 đến 5, hỗ trợ mầm non)
 * - Phép toán (+, -, ×, ÷, đếm, so sánh, chẵn/lẻ)
 * - Phạm vi số (10, 20, 50, 100, 1000...)
 * - Tính chất có nhớ / không nhớ
 * - Khái niệm ngôn ngữ Tiếng Việt (âm đầu, vần, dấu thanh)
 * - Bối cảnh thế giới game (Ocean, Farm, Jungle, Space)
 */

import { extractSemantics } from './semanticExtractor'

export interface PedagogicalConstraints {
  subject: 'MATH' | 'VIETNAMESE' | 'SCIENCE' | 'ENGLISH'
  gradeLevel: 1 | 2 | 3 | 4 | 5
  mathType?: 'ADD' | 'SUB' | 'MUL' | 'DIV' | 'COUNT' | 'COMPARE' | 'PARITY'
  rangeMax: number // 10, 20, 50, 100, 1000
  hasRegrouping: boolean // có nhớ hay không
  languageConcept?: {
    type: 'LETTER' | 'INITIAL_CONSONANT' | 'RHYME' | 'TONE' | 'WORD_PAIR'
    targets: string[] // ví dụ: ['l', 'n'] hoặc ['an', 'at'] hoặc ['hỏi', 'ngã']
  }
  themeKey: 'ocean' | 'farm' | 'jungle' | 'space'
  rawPrompt: string
}

function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function parsePedagogicalConstraints(prompt: string): PedagogicalConstraints {
  const raw = prompt || ''
  const lower = raw.toLowerCase()
  const norm = normalizeText(raw)

  // 1. Khối lớp (Grade Level)
  let gradeLevel: 1 | 2 | 3 | 4 | 5 = 2 // Mặc định lớp 2 cho cấp tiểu học
  if (
    lower.includes('lớp 1') ||
    lower.includes('khoi 1') ||
    norm.includes('lop 1') ||
    norm.includes('khoi 1') ||
    lower.includes('mầm non') ||
    lower.includes('mẫu giáo') ||
    norm.includes('mam non') ||
    lower.includes('grade 1')
  ) {
    gradeLevel = 1
  } else if (
    lower.includes('lớp 3') ||
    lower.includes('khoi 3') ||
    norm.includes('lop 3') ||
    lower.includes('grade 3')
  ) {
    gradeLevel = 3
  } else if (
    lower.includes('lớp 4') ||
    lower.includes('khoi 4') ||
    norm.includes('lop 4') ||
    lower.includes('grade 4')
  ) {
    gradeLevel = 4
  } else if (
    lower.includes('lớp 5') ||
    lower.includes('khoi 5') ||
    norm.includes('lop 5') ||
    lower.includes('grade 5')
  ) {
    gradeLevel = 5
  } else if (
    lower.includes('lớp 2') ||
    lower.includes('khoi 2') ||
    norm.includes('lop 2') ||
    lower.includes('grade 2')
  ) {
    gradeLevel = 2
  }

  // 2. Môn học (Subject)
  let subject: 'MATH' | 'VIETNAMESE' | 'SCIENCE' | 'ENGLISH' = 'MATH'
  const isEnglish =
    lower.includes('tiếng anh') ||
    lower.includes('english') ||
    norm.includes('tieng anh') ||
    lower.includes('vocabulary')
  const isVietnamese =
    lower.includes('tiếng việt') ||
    norm.includes('tieng viet') ||
    lower.includes('vietnamese') ||
    lower.includes('âm ') ||
    lower.includes('ngữ âm') ||
    lower.includes('âm đầu') ||
    lower.includes('dấu thanh') ||
    lower.includes('chính tả') ||
    lower.includes('tập đọc') ||
    lower.includes('ghép chữ') ||
    lower.includes('vần') ||
    norm.includes('van ') ||
    lower.includes('chữ cái')
  const isScience =
    lower.includes('khoa học') ||
    norm.includes('khoa hoc') ||
    lower.includes('tự nhiên và xã hội') ||
    lower.includes('tnxh') ||
    lower.includes('môi trường')
  const isMath =
    lower.includes('toán') ||
    norm.includes('toan') ||
    lower.includes('cộng') ||
    lower.includes('trừ') ||
    lower.includes('nhân') ||
    lower.includes('chia') ||
    lower.includes('phép tính') ||
    lower.includes('phạm vi') ||
    lower.includes('số chẵn') ||
    lower.includes('số lẻ') ||
    lower.includes('đếm') ||
    lower.includes('so sánh') ||
    lower.includes('bảng nhân') ||
    lower.includes('bảng chia')

  if (isEnglish) {
    subject = 'ENGLISH'
  } else if (isVietnamese && !isMath) {
    subject = 'VIETNAMESE'
  } else if (isScience && !isMath) {
    subject = 'SCIENCE'
  } else {
    subject = 'MATH'
  }

  // 3. Phép toán (Math Type)
  let mathType: PedagogicalConstraints['mathType'] = undefined
  if (subject === 'MATH') {
    if (
      lower.includes('chẵn') ||
      lower.includes('lẻ') ||
      norm.includes('chan') ||
      norm.includes('le')
    ) {
      mathType = 'PARITY'
    } else if (
      lower.includes('so sánh') ||
      lower.includes('lớn hơn') ||
      lower.includes('bé hơn') ||
      lower.includes('thứ tự') ||
      norm.includes('so sanh') ||
      norm.includes('lon hon') ||
      norm.includes('be hon')
    ) {
      mathType = 'COMPARE'
    } else if (
      lower.includes('đếm') ||
      lower.includes('bao nhiêu con') ||
      lower.includes('bao nhiêu quả') ||
      norm.includes('dem')
    ) {
      mathType = 'COUNT'
    } else if (
      lower.includes('nhân') ||
      lower.includes('gấp') ||
      lower.includes('tích') ||
      norm.includes('nhan') ||
      norm.includes('bang nhan')
    ) {
      mathType = 'MUL'
    } else if (
      lower.includes('chia') ||
      lower.includes('chia đều') ||
      lower.includes('thương') ||
      norm.includes('bang chia')
    ) {
      mathType = 'DIV'
    } else if (
      lower.includes('trừ') ||
      lower.includes('bớt') ||
      lower.includes('còn lại') ||
      lower.includes('hiệu') ||
      norm.includes('tru') ||
      norm.includes('bot') ||
      norm.includes('con lai')
    ) {
      mathType = 'SUB'
    } else if (
      lower.includes('cộng') ||
      lower.includes('thêm') ||
      lower.includes('tổng') ||
      norm.includes('cong') ||
      norm.includes('them') ||
      norm.includes('tong')
    ) {
      mathType = 'ADD'
    } else {
      mathType = gradeLevel === 1 ? 'ADD' : 'ADD'
    }
  }

  // 4. Phạm vi số (RangeMax)
  let rangeMax = 100
  const rangeMatch =
    raw.match(/phạm\s*vi\s*(?:đến|trong\s*khoảng)?\s*(\d+)/i) ||
    raw.match(/trong\s*khoảng\s*(\d+)/i) ||
    raw.match(/từ\s*\d+\s*(?:đến|tới)\s*(\d+)/i) ||
    raw.match(/đến\s*(\d+)/i) ||
    raw.match(/<=?\s*(\d+)/) ||
    norm.match(/pham\s*vi\s*(\d+)/i) ||
    norm.match(/trong\s*khoang\s*(\d+)/i)

  if (rangeMatch && rangeMatch[1]) {
    const val = parseInt(rangeMatch[1], 10)
    if (!isNaN(val) && val > 0) {
      rangeMax = val
    }
  } else {
    // Giá trị chuẩn theo chương trình GDPT 2018
    if (gradeLevel === 1) {
      rangeMax = mathType === 'COUNT' ? 10 : 20
    } else if (gradeLevel === 2) {
      rangeMax = 100
    } else if (gradeLevel === 3) {
      rangeMax = 1000
    } else if (gradeLevel >= 4) {
      rangeMax = 10000
    }
  }

  // 5. Tính chất có nhớ / không nhớ (hasRegrouping)
  let hasRegrouping = false
  if (
    lower.includes('không nhớ') ||
    norm.includes('khong nho') ||
    lower.includes('ko nhớ')
  ) {
    hasRegrouping = false
  } else if (
    lower.includes('có nhớ') ||
    norm.includes('co nho') ||
    lower.includes('qua 10') ||
    norm.includes('qua 10')
  ) {
    hasRegrouping = true
  } else {
    // Nếu không nói rõ: với lớp 2 phạm vi 100, nếu là bài cộng/trừ mặc định thường không nhớ trừ khi cần
    hasRegrouping = false
  }

  // 6. Tiếng Việt - Khái niệm ngôn ngữ (Language Concept)
  let languageConcept: PedagogicalConstraints['languageConcept'] = undefined
  if (subject === 'VIETNAMESE') {
    // 6.1 Dấu thanh
    if (
      lower.includes('dấu hỏi') ||
      lower.includes('dấu ngã') ||
      (lower.includes('hỏi') && lower.includes('ngã'))
    ) {
      languageConcept = { type: 'TONE', targets: ['hỏi', 'ngã'] }
    } else if (
      lower.includes('dấu sắc') ||
      lower.includes('dấu huyền') ||
      (lower.includes('sắc') && lower.includes('huyền'))
    ) {
      languageConcept = { type: 'TONE', targets: ['sắc', 'huyền'] }
    }
    // 6.2 Vần
    else if (
      lower.includes('vần an') ||
      lower.includes('vần at') ||
      /\ban\b/.test(lower) && /\bat\b/.test(lower)
    ) {
      languageConcept = { type: 'RHYME', targets: ['an', 'at'] }
    } else if (
      lower.includes('vần am') ||
      lower.includes('vần ap') ||
      /\bam\b/.test(lower) && /\bap\b/.test(lower)
    ) {
      languageConcept = { type: 'RHYME', targets: ['am', 'ap'] }
    }
    // 6.3 Phân biệt âm đầu
    else if (
      /\bl\b/.test(lower) && /\bn\b/.test(lower) ||
      lower.includes('l và n') ||
      lower.includes('l/n')
    ) {
      languageConcept = { type: 'INITIAL_CONSONANT', targets: ['l', 'n'] }
    } else if (
      /\bs\b/.test(lower) && /\bx\b/.test(lower) ||
      lower.includes('s và x') ||
      lower.includes('s/x')
    ) {
      languageConcept = { type: 'INITIAL_CONSONANT', targets: ['s', 'x'] }
    } else if (
      lower.includes('ch') && lower.includes('tr') ||
      lower.includes('ch và tr') ||
      lower.includes('ch/tr')
    ) {
      languageConcept = { type: 'INITIAL_CONSONANT', targets: ['ch', 'tr'] }
    } else if (
      /\bd\b/.test(lower) && /\bđ\b/.test(lower) ||
      lower.includes('d và đ') ||
      lower.includes('d/đ')
    ) {
      languageConcept = { type: 'INITIAL_CONSONANT', targets: ['d', 'đ'] }
    } else if (
      /\bc\b/.test(lower) && /\bk\b/.test(lower) ||
      lower.includes('c và k') ||
      lower.includes('c/k')
    ) {
      languageConcept = { type: 'INITIAL_CONSONANT', targets: ['c', 'k'] }
    } else if (
      lower.includes('g và gh') ||
      lower.includes('g/gh')
    ) {
      languageConcept = { type: 'INITIAL_CONSONANT', targets: ['g', 'gh'] }
    } else if (
      lower.includes('ng và ngh') ||
      lower.includes('ng/ngh')
    ) {
      languageConcept = { type: 'INITIAL_CONSONANT', targets: ['ng', 'ngh'] }
    } else {
      languageConcept = { type: 'LETTER', targets: ['a', 'b', 'c'] }
    }
  }

  // 7. Bối cảnh thế giới Game (Theme Key)
  const semantics = extractSemantics(raw)
  const themeKey = semantics.themeKey

  return {
    subject,
    gradeLevel,
    mathType,
    rangeMax,
    hasRegrouping,
    languageConcept,
    themeKey,
    rawPrompt: raw,
  }
}
