/**
 * NUMBER_LINE (Toán): kéo một điểm đến đúng vị trí trên trục số. Loại game THỬ NGHIỆM: không thuộc DSL 1.0.0 (đang
 * đóng băng) và không có trong `GAME_TYPES`; chỉ sống trong `experiments/` với dữ liệu mẫu cục bộ.
 */
export interface NumberLineQuestion {
  id: string
  /** Câu hỏi/yêu cầu, ví dụ "Đặt chú ong vào số 7". 1 đến 200 ký tự. */
  questionText: string
  audioText?: string
  audioUrl?: string
  /** Giá trị nhỏ nhất, lớn nhất và bước nhảy (đều là số nguyên; `step ≥ 1`; `(max - min)` chia hết cho `step`). */
  min: number
  max: number
  step: number
  /** Đáp án đúng (nằm trên một vạch). Dạng học sinh KHÔNG có trường này (xem `NumberLineStudentQuestion`). */
  target: number
  /** Cho phép lệch tối đa bao nhiêu (đơn vị giá trị, số nguyên ≥ 0). 0 = phải đúng vạch. */
  tolerance: number
  /** Vị trí ban đầu của điểm (mặc định `min`). */
  startValue?: number
}

/** Dạng gửi học sinh: không lộ đáp án (`target`) và độ lệch cho phép. Backend chấm. */
export type NumberLineStudentQuestion = Omit<NumberLineQuestion, 'target' | 'tolerance'>

/** Kết quả chấm của chế độ `play` (cha gọi API rồi trả về): có `correctValue` thì renderer chỉ luôn vạch đúng để trẻ học. */
export interface NumberLineAnswerResult {
  isCorrect: boolean
  correctValue?: number
}
