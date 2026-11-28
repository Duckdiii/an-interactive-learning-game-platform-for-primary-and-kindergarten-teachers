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

    @Test
    void orderingGenerationAndEditPersistIndependentSteps() throws Exception {
        String token = registerAndLogin();
        Call generated = call("ordering-generate", "POST", "/api/games/generate", token, """
                {"gameType":"ORDERING","subject":"MATH","gradeLevel":"GRADE_1","idea":"Sắp xếp các bước trồng cây"}
                """);
        assertThat(generated.status()).isEqualTo(200);
        ObjectNode game = (ObjectNode) generated.body().path("data").deepCopy();
        String gameId = game.path("gameId").asString();
        assertThat(game.path("questions").get(0).path("steps").size()).isGreaterThanOrEqualTo(2);
        game.remove(List.of("gameId", "status", "updatedAt"));
        ((ObjectNode) game.path("questions").get(0).path("steps").get(0)).put("text", "Chuẩn bị hạt giống");
        assertThat(call("ordering-save", "PUT", "/api/games/" + gameId, token, json.writeValueAsString(game)).status()).isEqualTo(200);
        var stored = call("ordering-reread", "GET", "/api/games/" + gameId, token, null).body().path("data");
        assertThat(stored.path("questions")).isEqualTo(game.path("questions"));
    }

    @Override
    void assertRevised(JsonNode revisedGame) {
        // Chuỗi chỉ AI giả trả ở nhánh revise: chứng tỏ kết quả đi qua revise chứ không phải sinh mới.
        assertThat(revisedGame.path("questions").toString()).contains(FakeAiConfiguration.REVISED_MARKER);
    }

    @Test
    void contextualRevisionPreservesUntouchedContentAndPersistsThroughTheRealApi() throws Exception {
        String token = registerAndLogin();
        String gameId = generateQuiz(token);
        ObjectNode edited = (ObjectNode) call("context-get", "GET", "/api/games/" + gameId, token, null)
                .body().path("data").deepCopy();
        edited.remove(List.of("gameId", "status", "updatedAt"));
        ((ObjectNode) edited.path("questions").get(0)).put("questionText", "Câu đầu đã được giáo viên chỉnh.");
        assertThat(call("context-put", "PUT", "/api/games/" + gameId, token, json.writeValueAsString(edited)).status()).isEqualTo(200);
        Call revised = call("context-revise", "POST", "/api/games/" + gameId + "/revise", token, """
                {"instruction":"Theo yêu cầu trước, đổi con chó thành con gà",
                 "history":[{"role":"TEACHER","text":"Chỉ sửa câu thứ hai, giữ nguyên câu đầu"}]}
                """);
        assertThat(revised.status()).isEqualTo(200);
        ObjectNode body = (ObjectNode) revised.body().path("data").deepCopy();
        assertThat(body.path("questions").get(0).path("questionText").asString()).isEqualTo("Câu đầu đã được giáo viên chỉnh.");
        assertThat(optionTexts(body.path("questions").get(0))).isEqualTo(optionTexts(edited.path("questions").get(0)));
        assertThat(correctLabel(body.path("questions").get(0))).isEqualTo(correctLabel(edited.path("questions").get(0)));
        assertThat(body.path("questions").get(1).path("questionText").asString()).contains("con gà");
        body.remove(List.of("gameId", "status", "updatedAt"));
        assertThat(call("context-save", "PUT", "/api/games/" + gameId, token, json.writeValueAsString(body)).status()).isEqualTo(200);
        var stored = call("context-reread", "GET", "/api/games/" + gameId, token, null).body().path("data");
        assertThat(stored.path("questions")).isEqualTo(body.path("questions"));
    }

    private List<String> optionTexts(JsonNode question) {
        return java.util.stream.StreamSupport.stream(question.path("options").spliterator(), false)
                .map(option -> option.path("text").asString()).sorted().toList();
    }

    private String correctLabel(JsonNode question) {
        for (var option : question.path("options")) {
            if (option.path("id").asString().equals(question.path("correctOptionId").asString()))
                return option.path("text").asString();
        }
        throw new AssertionError("Missing correct answer");
    }

    /**
     * Sinh game xong thì giáo viên xem được bản đối chiếu chương trình; sửa game bằng PUT thì bản đó thành STALE.
     * Profile test tắt truy xuất chương trình nên trạng thái lúc sinh là UNAVAILABLE.
     * Không assert kiểu của {@code evidence}/{@code claims}/{@code warnings} ở đây: H2 trả cột JSON thành chuỗi (KNOWN-GAPS #22);
     * kiểu object/mảng được kiểm trên Postgres thật ở {@code GameCurriculumReviewPersistenceTest} (Testcontainers).
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
        assertThat(call("put-unchanged", "PUT", "/api/games/" + gameId, token, json.writeValueAsString(edited)).status())
                .isEqualTo(200);
        Call unchanged = call("curriculum-review-unchanged", "GET", "/api/games/" + gameId + "/curriculum-review", token, null);
        assertThat(unchanged.body().path("data").path("status").asString()).isEqualTo("UNAVAILABLE");

        ((ObjectNode) edited.path("metadata")).put("title", "Đếm con vật sau khi soạn");
        assertThat(call("put", "PUT", "/api/games/" + gameId, token, json.writeValueAsString(edited)).status()).isEqualTo(200);

        Call stale = call("curriculum-review-after-put", "GET", "/api/games/" + gameId + "/curriculum-review", token, null);
        assertThat(stale.body().path("data").path("status").asString()).isEqualTo("STALE");
    }
}
