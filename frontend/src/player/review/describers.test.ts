import { describe, expect, it } from 'vitest'
import type {
  MatchingStudentQuestion,
  StudentDragDropQuestion,
  StudentQuizQuestion,
  StudentWordScrambleQuestion,
} from '../../types/game-student.types'
import { REVIEW_DESCRIBERS } from './describers'

const quiz: StudentQuizQuestion = {
  id: 'q1',
  timeLimitSeconds: 30,
  points: 10,
  questionText: '1 + 2 = ?',
  options: [
    { id: 'a', text: '3' },
    { id: 'b', text: '4' },
  ],
}
const matching: MatchingStudentQuestion = {
  id: 'q1',
  timeLimitSeconds: 30,
  points: 10,
  leftItems: [
    { id: 'l1', text: 'Chó' },
    { id: 'l2', visualPrompt: 'con mèo' },
  ],
  rightItems: [
    { id: 'r1', text: 'Gâu' },
    { id: 'r2', text: 'Meo' },
  ],
}
const expected = { matches: [{ leftPairId: 'l1', rightPairId: 'r1' }, { leftPairId: 'l2', rightPairId: 'r2' }] }
const quizDescriber = REVIEW_DESCRIBERS.QUIZ!
const matchingDescriber = REVIEW_DESCRIBERS.MATCHING!

describe('describer ODD_ONE_OUT và VISUAL_CLOZE', () => {
  const odd = { id: 'q1', items: [{ id: 'a', text: 'mèo' }, { id: 'b', text: 'xe' }] }
  const cloze = { id: 'q1', sentenceTemplate: 'Con ___ kêu meo', options: ['mèo', 'chó'] }

  it('ODD_ONE_OUT: đọc mục theo id; thiếu đáp án thì không có vế đúng', () => {
    const describer = REVIEW_DESCRIBERS.ODD_ONE_OUT!

    expect(describer.chosen(odd as never, { selectedItemId: 'a' } as never, null)).toBe('mèo')
    expect(describer.correct(odd as never, { selectedItemId: 'b' })).toBe('xe')
    expect(describer.correct(odd as never, null)).toBeNull()
  })

  it('VISUAL_CLOZE: hiện câu có chỗ trống và từ đã chọn', () => {
    const describer = REVIEW_DESCRIBERS.VISUAL_CLOZE!

    expect(describer.prompt(cloze as never)).toBe('Con ___ kêu meo')
    expect(describer.chosen(cloze as never, { answer: 'chó' } as never, null)).toBe('chó')
    expect(describer.correct(cloze as never, { answer: 'mèo' })).toBe('mèo')
    expect(describer.correct(cloze as never, { answer: 1 })).toBeNull()
  })
})

describe('describer QUIZ', () => {
  it('câu hỏi, lựa chọn đúng và sai theo chữ', () => {
    expect(quizDescriber.prompt(quiz as never)).toBe('1 + 2 = ?')
    expect(quizDescriber.chosen(quiz as never, { selectedOptionId: 'b' } as never, { selectedOptionId: 'a' })).toBe('4')
    expect(quizDescriber.correct(quiz as never, { selectedOptionId: 'a' })).toBe('3')
  })

  it('id lạ thì "?"; đáp án đúng null hoặc sai hình dạng thì không có', () => {
    expect(quizDescriber.chosen(quiz as never, { selectedOptionId: 'z' } as never, null)).toBe('?')
    expect(quizDescriber.correct(quiz as never, { selectedOptionId: 'z' })).toBe('?')
    expect(quizDescriber.correct(quiz as never, null)).toBeNull()
    expect(quizDescriber.correct(quiz as never, { selectedOptionId: 5 })).toBeNull()
  })
})

describe('describer MATCHING', () => {
  it('nối đủ cặp: "Nối đúng cả N cặp"', () => {
    expect(matchingDescriber.chosen(matching as never, expected as never, expected)).toBe('Nối đúng cả 2 cặp')
  })

  it('nối thiếu hoặc sai cặp: đếm cặp trùng', () => {
    const answer = { matches: [{ leftPairId: 'l1', rightPairId: 'r1' }, { leftPairId: 'l2', rightPairId: 'r1' }] }

    expect(matchingDescriber.chosen(matching as never, answer as never, expected)).toBe('Nối đúng 1/2 cặp')
    expect(matchingDescriber.chosen(matching as never, { matches: [] } as never, expected)).toBe('Nối đúng 0/2 cặp')
  })

  it('đáp án đúng liệt kê "trái – phải" theo nội dung hiển thị', () => {
    expect(matchingDescriber.correct(matching as never, expected)).toBe('Chó – Gâu; con mèo – Meo')
  })

  it('đáp án đúng sai hình dạng thì không có, không ném lỗi', () => {
    expect(matchingDescriber.correct(matching as never, null)).toBeNull()
    expect(matchingDescriber.correct(matching as never, { matches: 'x' })).toBeNull()
    expect(matchingDescriber.correct(matching as never, { matches: [{ leftPairId: 1 }] })).toBeNull()
    // Không có đáp án đúng thì không được khẳng định "nối đúng".
    expect(matchingDescriber.chosen(matching as never, expected as never, null)).toBe('Đã nối 2 cặp')
  })

  it('một cặp đúng gửi lặp hai lần không được tính thành "nối đúng cả"', () => {
    const doubled = { matches: [expected.matches[0], expected.matches[0]] }

    expect(matchingDescriber.chosen(matching as never, doubled as never, expected)).toBe('Nối đúng 1/2 cặp')
  })
})

describe('describer DRAG_DROP', () => {
  const dragDrop: StudentDragDropQuestion = {
    id: 'q1',
    timeLimitSeconds: 30,
    points: 10,
    dropZones: [
      { id: 'z1', label: 'Dưới nước' },
      { id: 'z2', label: 'Trên cạn' },
    ],
    items: [
      { id: 'i1', text: 'Cá' },
      { id: 'i2', text: 'Mèo' },
    ],
  }
  const ddExpected = { placements: [{ itemId: 'i1', zoneId: 'z1' }, { itemId: 'i2', zoneId: 'z2' }] }
  const ddDescriber = REVIEW_DESCRIBERS.DRAG_DROP!

  it('hiển thị danh sách phân loại của học sinh', () => {
    expect(ddDescriber.chosen(dragDrop as never, ddExpected as never, ddExpected)).toBe('Cá → Dưới nước; Mèo → Trên cạn')
  })

  it('xếp sang rổ khác: hiển thị đúng phân loại đã chọn', () => {
    const answer = { placements: [{ itemId: 'i1', zoneId: 'z1' }, { itemId: 'i2', zoneId: 'z1' }] }
    expect(ddDescriber.chosen(dragDrop as never, answer as never, ddExpected)).toBe('Cá → Dưới nước; Mèo → Dưới nước')
  })

  it('đáp án đúng liệt kê "vật -> rổ"', () => {
    expect(ddDescriber.correct(dragDrop as never, ddExpected)).toBe('Cá → Dưới nước; Mèo → Trên cạn')
  })

  it('đáp án đúng không hợp lệ thì trả null', () => {
    expect(ddDescriber.correct(dragDrop as never, null)).toBeNull()
    expect(ddDescriber.correct(dragDrop as never, { placements: 'invalid' })).toBeNull()
  })
})

describe('describer WORD_SCRAMBLE', () => {
  const wsQuestion: StudentWordScrambleQuestion = {
    id: 'q1',
    timeLimitSeconds: 30,
    points: 10,
    scrambledLetters: ['ẹ', 'm'],
  }
  const wsDescriber = REVIEW_DESCRIBERS.WORD_SCRAMBLE!

  it('hiển thị từ học sinh đã ghép', () => {
    expect(wsDescriber.chosen(wsQuestion as never, { word: 'mẹ' } as never, { word: 'mẹ' })).toBe('mẹ')
  })

  it('hiển thị từ đúng do máy chủ trả', () => {
    expect(wsDescriber.correct(wsQuestion as never, { word: 'mẹ' })).toBe('mẹ')
    expect(wsDescriber.correct(wsQuestion as never, null)).toBeNull()
  })
})
