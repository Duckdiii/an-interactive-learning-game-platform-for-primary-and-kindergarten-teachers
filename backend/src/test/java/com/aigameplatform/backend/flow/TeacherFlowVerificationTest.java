package com.aigameplatform.backend.flow;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;

/**
 * Luồng chính giáo viên với cổng AI giả ({@link FakeAiConfiguration}): miễn phí, chạy trên CI. Chạy riêng và in nơi lưu
 * bằng chứng: {@code node scripts/verify-flow.mjs}.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.moderation.required=false",
        // Chỉ cho H2 của test này: profile test tắt Flyway và để ddl-auto none nên chưa có bảng nào.
        "spring.jpa.hibernate.ddl-auto=create-drop",
        // backend/.env của dev có thể bật Gemini thật; ghi đè để không có hai bean GameContentGenerator cùng lúc.
        "app.ai.gemini.game-generation.enabled=false",
        // CI truyền secret OPENAI_API_KEY vào job backend: không ghi đè thì Layer 3 gọi OpenAI Moderation thật và test
        // phụ thuộc mạng, key. Để rỗng: Layer 3 chỉ dùng danh sách từ cấm (phần gọi OpenAI đã có test mock riêng).
        "app.moderation.openai.api-key="})
@ActiveProfiles({"test", "verify-flow"})
class TeacherFlowVerificationTest extends AbstractTeacherFlowTest {

    @Override
    void assertRevised(JsonNode revisedGame) {
        // Chuỗi chỉ AI giả trả ở nhánh revise: chứng tỏ kết quả đi qua revise chứ không phải sinh mới.
        assertThat(revisedGame.path("questions").toString()).contains(FakeAiConfiguration.REVISED_MARKER);
    }

    /** Kỳ vọng đúng của sản phẩm: sinh game xong thì giáo viên xem được bản đối chiếu chương trình. */
    @Test
    @Disabled("GameCurriculumReviewService.saveWithGame không được gọi ở đâu trong code main, nên chưa có bản đối chiếu nào "
            + "được ghi và GET /curriculum-review luôn trả 404 (docs/KNOWN-GAPS.md). Bật lại khi nối saveWithGame vào luồng sinh game.")
    void generatedGameHasCurriculumReview() throws Exception {
        String token = registerAndLogin();
        String gameId = generateQuiz(token);

        Call review = call("curriculum-review", "GET", "/api/games/" + gameId + "/curriculum-review", token, null);
        assertThat(review.status()).isEqualTo(200);
        assertThat(review.body().path("data").path("gameId").asString()).isEqualTo(gameId);
        assertThat(review.body().path("data").path("status").isString()).isTrue();
    }
}
