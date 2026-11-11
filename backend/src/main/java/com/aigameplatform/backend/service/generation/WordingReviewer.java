package com.aigameplatform.backend.service.generation;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.List;

/**
 * Rà chữ trẻ thấy hoặc nghe trong game đã qua 3 lớp kiểm duyệt, tìm từ không có thật hoặc sai chính tả (ví dụ "dạp", "ngắn bó") mà luật
 * máy không bắt được. Qua interface để test mock được, không gọi API thật.
 */
public interface WordingReviewer {

    /**
     * @param topic yêu cầu của giáo viên (để biết game luyện chính tả, nơi lựa chọn sai cố ý viết sai là hợp lệ)
     * @return lỗi tìm thấy (rỗng nếu không có)
     * @throws AiServiceUnavailableException khi gọi AI lỗi; nơi gọi bỏ qua bước rà thay vì làm hỏng việc tạo game
     */
    List<ValidationError> review(GameDsl game, String topic);
}
