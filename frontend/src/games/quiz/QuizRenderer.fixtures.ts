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

/**
 * Câu hỏi dài sát giới hạn 200 ký tự của DSL (195 ký tự, nhiều từ dài) kèm ảnh và audio — dùng để kiểm
 * tra chữ không bị cắt và nút Nghe lại không bị đè khi câu hỏi wrap thành nhiều dòng.
 */
export const mockQuizQuestionLongText: QuizQuestion = {
  ...mockQuizQuestion,
  id: 'q3',
  audioText: 'Câu hỏi dài',
  questionText:
    'Hôm nay bạn Minh cùng gia đình đi công viên, nhìn thấy thật nhiều chú mèo con lông vàng đang chơi đùa trên thảm cỏ xanh mướt; hỏi bạn Minh đã đếm được tất cả bao nhiêu chú mèo con dễ thương ở đó?',
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
