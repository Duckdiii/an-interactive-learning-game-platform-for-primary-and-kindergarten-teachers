import type { MatchingQuestion } from '../../types/game-dsl.types'
import type { MatchingStudentQuestion } from '../../types/game-student.types'

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
