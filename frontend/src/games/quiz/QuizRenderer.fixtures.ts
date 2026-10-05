import type { QuizQuestion } from '../../types/game-dsl.types'

/**
 * Dữ liệu mẫu QuizQuestion, khớp đúng field thật của `QuizQuestion` trong `types/game-dsl.types.ts`
 * (không phải interface tự đặt trong task gốc — Quiz chỉ có đáp án dạng chữ, không có ảnh riêng từng
 * đáp án; ảnh minh hoạ nếu có nằm ở `imageUrl` cấp câu hỏi, kế thừa từ `QuestionBase`).
 * Dùng để dựng và test `QuizRenderer` trước khi có Backend/AI thật.
 */
export const mockQuizQuestion: QuizQuestion = {
  id: 'q1',
  timeLimitSeconds: 30,
  points: 10,
  audioText: 'Có mấy con mèo?',
  audioUrl: '/mock/q1.wav',
  visualPrompt: 'three cats sitting together',
  imageUrl: '/mock/three-cats.png',
  questionText: 'Có mấy con mèo?',
  options: [
    { id: 'a', text: '2' },
    { id: 'b', text: '3' },
    { id: 'c', text: '4' },
  ],
  correctOptionId: 'b',
}

/** Câu hỏi không có audio/ảnh, dùng để test renderer vẫn chạy đúng khi 2 field này vắng mặt. */
export const mockQuizQuestionNoMedia: QuizQuestion = {
  id: 'q2',
  timeLimitSeconds: 30,
  points: 10,
  questionText: 'Có mấy con chó?',
  options: [
    { id: 'a', text: '1' },
    { id: 'b', text: '5' },
  ],
  correctOptionId: 'a',
}
