import type { MatchingQuestion } from '../../types/game-dsl.types'
import type { MatchingStudentItem, MatchingStudentQuestion } from '../../types/game-student.types'
import { seededDerangement } from '../common/seededDerangement'
import type { PairLink } from './matchingTypes'

/**
 * Dữ liệu mẫu MATCHING, khớp đúng field thật trong DSL v1.0.0 (`pairs[{pairId, left, right}]`, 3 đến 6 cặp)
 * và dạng gửi học sinh (id mờ, hai cột đã xáo). Dùng để dựng và test `MatchingRenderer` trước khi có
 * Backend/AI thật.
 */
export const mockMatchingQuestion: MatchingQuestion = {
  id: 'q1',
  timeLimitSeconds: 60,
  points: 10,
  audioText: 'Nối từ với nghĩa',
  audioUrl: '/mock/q1.wav',
  pairs: [
    { pairId: 'p1', left: { text: 'apple' }, right: { text: 'táo' } },
    { pairId: 'p2', left: { text: 'dog' }, right: { text: 'chó' } },
    { pairId: 'p3', left: { text: 'cat' }, right: { text: 'mèo' } },
  ],
}

/**
 * Cùng nội dung nhưng ở dạng học sinh: client không biết cặp nào ghép với cặp nào. Đáp án (chỉ Backend biết)
 * là l1-r2 (apple-táo), l2-r3 (dog-chó), l3-r1 (cat-mèo); xem `mockMatchingStudentCorrect`.
 */
export const mockMatchingStudentQuestion: MatchingStudentQuestion = {
  id: 'q1',
  timeLimitSeconds: 60,
  points: 10,
  audioText: 'Nối từ với nghĩa',
  audioUrl: '/mock/q1.wav',
  leftItems: [
    { id: 'l1', text: 'apple' },
    { id: 'l2', text: 'dog' },
    { id: 'l3', text: 'cat' },
  ],
  rightItems: [
    { id: 'r1', text: 'mèo' },
    { id: 'r2', text: 'táo' },
    { id: 'r3', text: 'chó' },
  ],
}

/** Đáp án đúng của `mockMatchingStudentQuestion`, như Backend trả trong `correctAnswer.matches` sau khi chấm. */
export const mockMatchingStudentCorrect = [
  { leftPairId: 'l1', rightPairId: 'r2' },
  { leftPairId: 'l2', rightPairId: 'r3' },
  { leftPairId: 'l3', rightPairId: 'r1' },
]

/**
 * Ba kiểu thẻ trong cùng một màn: chữ kèm ảnh (apple, cat), chỉ chữ (táo, dog...), và chỉ ảnh (hình con chó,
 * chỉ có `visualPrompt` làm chữ dự phòng nếu ảnh chưa tải). Ảnh là tệp giả trong `public/mock/`.
 */
export const mockMatchingQuestionWithImages: MatchingQuestion = {
  id: 'q2',
  timeLimitSeconds: 60,
  points: 10,
  audioText: 'Nối con vật với tên của nó',
  audioUrl: '/mock/q1.wav',
  pairs: [
    { pairId: 'p1', left: { text: 'apple', imageUrl: '/mock/apple.png' }, right: { text: 'táo' } },
    { pairId: 'p2', left: { text: 'dog' }, right: { visualPrompt: 'dog', imageUrl: '/mock/dog.png' } },
    {
      pairId: 'p3',
      left: { text: 'cat', imageUrl: '/mock/cat.png' },
      right: { text: 'mèo', imageUrl: '/mock/cat.png' },
    },
  ],
}

/** 6 cặp: mức tối đa của DSL, để kiểm tra canvas dài nhất vẫn gọn và các hàng không đè nhau. */
export const mockMatchingQuestionSixPairs: MatchingQuestion = {
  id: 'q3',
  timeLimitSeconds: 90,
  points: 20,
  audioText: 'Nối từ với nghĩa',
  pairs: [
    { pairId: 'p1', left: { text: 'apple' }, right: { text: 'táo' } },
    { pairId: 'p2', left: { text: 'dog' }, right: { text: 'chó' } },
    { pairId: 'p3', left: { text: 'cat' }, right: { text: 'mèo' } },
    { pairId: 'p4', left: { text: 'bird' }, right: { text: 'chim' } },
    { pairId: 'p5', left: { text: 'fish' }, right: { text: 'cá' } },
    { pairId: 'p6', left: { text: 'duck' }, right: { text: 'vịt' } },
  ],
}

/** Chữ dài sát giới hạn 100 ký tự của DSL ở cả hai cột, để kiểm tra thẻ cao lên mà không tràn hay bị cắt. */
export const mockMatchingQuestionLongText: MatchingQuestion = {
  id: 'q4',
  timeLimitSeconds: 120,
  points: 10,
  audioText: 'Đọc kỹ rồi nối mô tả với con vật',
  pairs: [
    {
      pairId: 'p1',
      left: { text: 'Con vật nhỏ bé có bộ lông vàng óng, hay kêu chiêm chiếp và thích đi theo mẹ khắp sân vườn mỗi sáng' },
      right: { text: 'gà con' },
    },
    {
      pairId: 'p2',
      left: { text: 'vịt' },
      right: { text: 'Loài vật hiền lành sống dưới ao, có đôi chân màu cam và biết bơi rất giỏi trong làn nước trong xanh' },
    },
    { pairId: 'p3', left: { text: 'mèo' }, right: { text: 'kêu meo meo' } },
  ],
}

/**
 * Dựng dạng HỌC SINH từ một câu dạng giáo viên, chỉ để thử trong sandbox/test: tách hai cột, xáo mỗi cột độc
 * lập, rồi gán id mờ (`l1...`, `r1...`) theo thứ tự hiển thị. Trả kèm đáp án đúng (chỉ Backend biết thật) để
 * giả lập bước chấm. Backend thật xáo bằng HMAC; ở đây dùng xáo có hạt giống cho ổn định. Lưu ý cho Backend:
 * thứ tự cột phải nên được xáo sao cho không cặp nào nằm cùng hàng ở hai cột (xem test của hàm này).
 */
export function makeStudentFixture(question: MatchingQuestion): {
  question: MatchingStudentQuestion
  correctMatches: PairLink[]
} {
  const leftOrder = seededDerangement(question.pairs, `${question.id}-student-left`)
  // Cột phải xáo THEO thứ tự cột trái (không phải theo thứ tự gốc): xáo hai cột độc lập có thể để một cặp
  // vẫn nằm cùng hàng ở cả hai cột, lộ đáp án qua vị trí.
  const rightOrder = seededDerangement(leftOrder, `${question.id}-student-right`)

  const leftItems: MatchingStudentItem[] = leftOrder.map((pair, index) => ({ id: `l${index + 1}`, ...pair.left }))
  const rightItems: MatchingStudentItem[] = rightOrder.map((pair, index) => ({ id: `r${index + 1}`, ...pair.right }))

  const correctMatches = question.pairs.map((pair) => ({
    leftPairId: `l${leftOrder.indexOf(pair) + 1}`,
    rightPairId: `r${rightOrder.indexOf(pair) + 1}`,
  }))

  const base: Omit<MatchingQuestion, 'pairs'> = {
    id: question.id,
    timeLimitSeconds: question.timeLimitSeconds,
    points: question.points,
    audioText: question.audioText,
    audioUrl: question.audioUrl,
    visualPrompt: question.visualPrompt,
    imageUrl: question.imageUrl,
  }
  return { question: { ...base, leftItems, rightItems }, correctMatches }
}
