/**
 * Kết quả chấm của một màn do component cha (đã gọi API) trả về cho renderer ở mode `play`.
 * `correctAnswer` cùng cấu trúc với trường `correctAnswer` của `POST /sessions/{id}/interactions`; Backend
 * chỉ trả sau khi đã chấm, nên đây là cách duy nhất để renderer hiện đáp án đúng cho trẻ học (ở dạng gửi
 * học sinh không có sẵn đáp án).
 */
export interface AnswerResult<TCorrect = unknown> {
  isCorrect: boolean
  correctAnswer?: TCorrect
}
