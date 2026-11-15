package com.aigameplatform.backend.flow;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Luồng chính giáo viên với cổng AI giả ({@link FakeAiConfiguration}): miễn phí, chạy trên CI. Chạy riêng và in nơi lưu
 * bằng chứng: {@code node scripts/verify-flow.mjs}.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.moderation.required=false",
        // Chỉ cho H2 của test này: profile test tắt Flyway và để ddl-auto none nên chưa có bảng nào.
        "spring.jpa.hibernate.ddl-auto=create-drop",
        // backend/.env của dev có thể bật Gemini thật; ghi đè để không có hai bean GameContentGenerator cùng lúc.
        // Khoá OpenAI để rỗng ở application-test.yml (dùng chung cho profile test), không ghi đè riêng ở đây.
        "app.ai.gemini.game-generation.enabled=false"})
@ActiveProfiles({"test", "verify-flow"})
class TeacherFlowVerificationTest extends AbstractTeacherFlowTest {

    @Override
    void assertRevised(JsonNode revisedGame) {
        // Chuỗi chỉ AI giả trả ở nhánh revise: chứng tỏ kết quả đi qua revise chứ không phải sinh mới.
        assertThat(revisedGame.path("questions").toString()).contains(FakeAiConfiguration.REVISED_MARKER);
    }

    /**
     * Sinh game xong thì giáo viên xem được bản đối chiếu chương trình; sửa game bằng PUT thì bản đó thành STALE.
     * Profile test tắt truy xuất chương trình nên trạng thái lúc sinh là UNAVAILABLE.
     * shortcut: không assert kiểu của {@code evidence}/{@code claims}/{@code warnings}: H2 trả cột JSON thành chuỗi, còn Postgres
     * jsonb trả object/mảng (đã kiểm ở GameCurriculumReviewPersistenceLiveTest); kiểm kiểu khi có test Postgres thật (KNOWN-GAPS #22).
     */
    @Test
    void generatedGameHasCurriculumReviewThatGoesStaleAfterEdit() throws Exception {
        String token = registerAndLogin();
        String gameId = generateQuiz(token);

        Call review = call("curriculum-review", "GET", "/api/games/" + gameId + "/curriculum-review", token, null);
        assertThat(review.status()).isEqualTo(200);
        assertThat(review.body().path("data").path("gameId").asString()).isEqualTo(gameId);
        assertThat(review.body().path("data").path("status").asString()).isEqualTo("UNAVAILABLE");

        ObjectNode edited = (ObjectNode) call("get", "GET", "/api/games/" + gameId, token, null).body().path("data").deepCopy();
        edited.remove(List.of("gameId", "status", "updatedAt"));
        assertThat(call("put", "PUT", "/api/games/" + gameId, token, json.writeValueAsString(edited)).status()).isEqualTo(200);

        Call stale = call("curriculum-review-after-put", "GET", "/api/games/" + gameId + "/curriculum-review", token, null);
        assertThat(stale.body().path("data").path("status").asString()).isEqualTo("STALE");
    }
}
