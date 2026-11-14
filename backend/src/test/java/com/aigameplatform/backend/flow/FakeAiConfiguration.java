package com.aigameplatform.backend.flow;

import com.aigameplatform.backend.service.generation.GameContentGenerator;
import com.aigameplatform.backend.service.understanding.GameUnderstandingGenerator;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Cổng AI giả cho test luồng (profile {@code verify-flow}): không gọi Gemini, chạy được trên CI và không tốn tiền.
 * Bản Gemini thật chỉ nạp khi {@code app.ai.gemini.game-generation.enabled=true}, nên hai bản không cùng tồn tại.
 */
@Configuration
@Profile("verify-flow")
class FakeAiConfiguration {

    /** Chuỗi thay thế khi sửa game, để test thấy được kết quả đi qua nhánh revise chứ không phải nhánh sinh mới. */
    static final String REVISED_MARKER = "con gà";

    @Bean
    GameContentGenerator fakeGameContentGenerator() {
        String quiz = classpath("ai-output-examples/quiz.json");
        return attempt -> attempt.revision() == null ? quiz : quiz.replace("con chó", REVISED_MARKER);
    }

    @Bean
    GameUnderstandingGenerator fakeGameUnderstandingGenerator() {
        return (system, user) -> """
                {"reply": "Em hiểu rồi ạ.", "question": null,
                 "understanding": {"learningGoal": "Đếm số lượng trong phạm vi 5", "childAction": "Chọn đáp án đúng",
                   "content": ["mèo", "chó"], "setting": "Trong lớp", "gameType": "QUIZ",
                   "alternativeGameTypes": ["MATCHING"], "unsupported": [], "assumptions": ["Lớp 1"]}}
                """;
    }

    private static String classpath(String path) {
        try (InputStream in = FakeAiConfiguration.class.getClassLoader().getResourceAsStream(path)) {
            if (in == null) throw new IllegalStateException("Thiếu fixture " + path);
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
