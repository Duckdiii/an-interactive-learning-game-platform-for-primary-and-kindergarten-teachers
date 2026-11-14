package com.aigameplatform.backend.flow;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;

/**
 * Luồng chính giáo viên với Gemini THẬT (tốn quota, khoảng 3 lần gọi). Không chạy trên CI; chỉ chạy khi được yêu cầu:
 * {@code node scripts/verify-flow.mjs --live} (cần GEMINI_API_KEY). DB vẫn là H2 như bản AI giả.
 */
@EnabledIfEnvironmentVariable(named = "RUN_LIVE_TEACHER_FLOW", matches = "true")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.moderation.required=false",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.ai.gemini.game-generation.enabled=true"})
@ActiveProfiles("test")
class TeacherFlowLiveTest extends AbstractTeacherFlowTest {

    @Override
    void assertRevised(JsonNode revisedGame) {
        assertThat(revisedGame.path("questions").size()).isPositive();
    }
}
