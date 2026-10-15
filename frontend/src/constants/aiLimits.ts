// Backend tự gọi lại dịch vụ AI tối đa 2 lần khi một lần quá thời gian (UC-06 5b, openapi `AiTimeout`): tối đa 1 + 2 = 3 lần, mỗi lần chờ tới 5 giây
// (SRS mục 3.1.1). Frontend KHÔNG tự thử lại thêm (sẽ nhân lên thành 9 lần gọi), nên thời gian chờ của lời gọi phải dài hơn cả ba lần
// đó, cộng một khoảng đệm cho đường truyền; ngắn hơn thì giáo viên thấy lỗi quá hạn trong khi Backend vẫn còn đang thử lại.
export const AI_ATTEMPT_TIMEOUT_MS = 5_000
export const AI_BACKEND_ATTEMPTS = 3
// Sinh MỘT game bằng AI (POST /games/generate): vừa viết nội dung, vừa tìm ảnh và tạo giọng đọc nên lâu hơn nhiều so với làm lại một câu ("vài giây
// đến vài chục giây" theo openapi.yaml). Backend cũng tự thử lại dịch vụ AI tối đa 2 lần, nên chờ đủ lâu; giáo viên vẫn hủy được bất cứ lúc nào.
export const GENERATE_GAME_TIMEOUT_MS = 60_000

// Gợi ý điều chỉnh khi nhờ AI làm lại (openapi `feedback`, FLD-14).
export const REGENERATE_FEEDBACK_MAX = 500

export const REGENERATE_QUESTION_TIMEOUT_MS = AI_BACKEND_ATTEMPTS * AI_ATTEMPT_TIMEOUT_MS + 5_000
