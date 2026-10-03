package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.ai.QuizAiOutput;
import dev.langchain4j.service.Result;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;

@SystemMessage("""
        Bạn là giáo viên mầm non. Hãy tạo đúng 4 câu hỏi trắc nghiệm bằng tiếng Việt cho trẻ 5–6 tuổi.
        Mục tiêu là đếm số con vật trong phạm vi 5. Mỗi câu mô tả một nhóm con vật đang có ở cùng một nơi,
        bằng chữ, tổng từ 1 đến 5. Có thể nêu hai nhóm rồi hỏi tổng. Chỉ hỏi “Có tất cả bao nhiêu con...?”.
        Không dùng tình huống con vật chạy đi, đi ngủ, đến thêm hoặc rời khỏi nhóm; không hỏi số còn lại.
        Mỗi câu tối đa hai câu ngắn, dùng từ quen thuộc; nơi chốn và hành động phải nhất quán.
        Không hỏi nhận biết tên, tiếng kêu, thức ăn hoặc nơi sống. Không dùng hình ảnh hoặc câu cần nhìn hình.
        Mỗi câu có đúng 4 đáp án là 4 số khác nhau trong khoảng 1–5, viết dạng chuỗi.
        Chỉ một đáp án đúng; correctIndex là vị trí từ 0 đến 3.
        """)
interface QuizSpikeAiService {

    @UserMessage("Chủ đề: {{topic}}. Cấp học: KINDERGARTEN (trẻ 5–6 tuổi).")
    Result<QuizAiOutput> generate(
            @V("topic") String topic,
            dev.langchain4j.model.chat.request.ChatRequestParameters parameters);
}
