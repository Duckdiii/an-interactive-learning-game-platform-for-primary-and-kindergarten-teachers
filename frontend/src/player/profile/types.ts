import type { Palette } from '../../games/common/palette'

/** Hai khung giao diện phía học sinh (SPEC mục 1): Bé (Mầm non, lớp 1) và Học sinh (lớp 2 đến 5). Không có nhóm tuổi thứ ba. */
export type AgeBand = 'be' | 'hocSinh'

/** `garden`: phản hồi nhẹ nhàng, không điểm, không "thua". `score`: điểm và chuỗi đúng. */
export type FeedbackPolicy = 'garden' | 'score'

/**
 * Mọi khác biệt giữa hai khung nằm ở đây; renderer và khung chỉ ĐỌC profile, không tự hỏi tuổi.
 * Giá trị số là mặc định để thử, chưa kiểm chứng với trẻ (SPEC mục 3).
 */
export interface UiProfile {
  band: AgeBand
  tokens: {
    /** Hệ số nhân cỡ chữ. */
    fontScale: number
    /** Vùng chạm tối thiểu, đơn vị px. */
    minTouch: number
    /** Có họa tiết trang trí và nhân vật lớn không. */
    decoration: boolean
    /** Bảng màu cho DOM (biến CSS) và Konva (`useGamePalette`); nguồn duy nhất, xem games/common/palette.ts. */
    colors: Palette
  }
  interaction: {
    /** Chạm là nộp luôn, không có nút "Xong". */
    tapToSubmit: boolean
    /** Sau bao lâu kể từ lúc vào câu mà trẻ chưa trả lời thì gợi ý nhẹ (ms); `null` là không gợi ý. Chưa tính từng lần chạm vì renderer không báo lên. */
    hintAfterMs: number | null
    /** Có hiện đồng hồ đếm giờ không. */
    timer: boolean
    /** Có hỏi biệt danh trước khi chơi không (Bé thì hệ thống tự đặt). */
    askNickname: boolean
    /** Điện thoại dọc mà loại game cần màn ngang thì chặn bằng màn nhắc xoay máy (Bé); khung kia để trẻ tự quyết. */
    enforceLandscape: boolean
  }
  audio: {
    /** Tự đọc lời nhắc khi vào câu mới (Bé chưa đọc được chữ). */
    autoReadPrompt: boolean
  }
  feedback: FeedbackPolicy
}
