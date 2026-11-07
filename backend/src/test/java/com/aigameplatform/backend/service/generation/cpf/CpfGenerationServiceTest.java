package com.aigameplatform.backend.service.generation.cpf;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.AiGenerationTimeoutException;
import com.aigameplatform.backend.exception.UnsafeContentException;
import com.aigameplatform.backend.service.generation.AiServiceUnavailableException;
import com.aigameplatform.backend.service.validation.ContentSafetyCheck;
import com.aigameplatform.backend.service.validation.cpf.CpfAssetCatalog;
import com.aigameplatform.backend.service.validation.cpf.CpfValidationService;
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import com.aigameplatform.backend.service.validation.safety.ContentModerationClient;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Vòng sinh game CPF với AI giả (không gọi Gemini thật), kiểm duyệt bằng chuỗi 3 lớp thật. */
class CpfGenerationServiceTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final String IDEA = "Bé kéo giỏ hứng những quả táo mang số chẵn rơi từ trên cây";

    private final CpfValidationService validation = new CpfValidationService(new CpfAssetCatalog(MAPPER),
            new ContentSafetyCheck(new BlockedWordList(List.of("cứt")), mock(ContentModerationClient.class), false), MAPPER);

    /** AI giả trả lần lượt các câu trả lời đã định và ghi lại mọi lần gọi. */
    private static final class ScriptedGenerator implements CpfContentGenerator {
        private final Iterator<String> answers;
        final List<CpfGenerationAttempt> attempts = new ArrayList<>();

        ScriptedGenerator(String... answers) {
            this.answers = List.of(answers).iterator();
        }

        @Override
        public String generate(CpfGenerationAttempt attempt) {
            attempts.add(attempt);
            return answers.next();
        }
    }

    private CpfGenerationService service(CpfContentGenerator generator) {
        var beans = new StaticListableBeanFactory(generator == null ? Map.of() : Map.of("generator", generator));
        return new CpfGenerationService(beans.getBeanProvider(CpfContentGenerator.class), validation, MAPPER, 2);
    }

    private static String example(String name) throws IOException {
        try (InputStream in = CpfGenerationServiceTest.class.getResourceAsStream("/cpf-examples/" + name + ".json")) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static String withEntityAsset(String json, String assetId) {
        ObjectNode game = (ObjectNode) MAPPER.readTree(json);
        ((ObjectNode) game.get("entities").get(0)).put("assetId", assetId);
        return MAPPER.writeValueAsString(game);
    }

    @Test
    void returnsTheGameWhenTheFirstAnswerPassesAllLayers() throws IOException {
        var ai = new ScriptedGenerator(example("catch-even-apples"));

        JsonNode game = service(ai).generate(IDEA, Subject.MATH, GradeLevel.GRADE_1);

        assertThat(game.path("kind").asString()).isEqualTo("CPF");
        assertThat(ai.attempts).singleElement().satisfies(a -> {
            assertThat(a.isRetry()).isFalse();
            assertThat(a.idea()).isEqualTo(IDEA);
        });
    }

    @Test
    void subjectAndGradeComeFromTheTeacherNotFromTheAi() throws IOException {
        // Ví dụ ghi VIETNAMESE / GRADE_2; giáo viên chọn ENGLISH / GRADE_3.
        var ai = new ScriptedGenerator(example("fishing-compound-words"));

        JsonNode game = service(ai).generate("Câu cá", Subject.ENGLISH, GradeLevel.GRADE_3);

        assertThat(game.path("metadata").path("subject").asString()).isEqualTo("ENGLISH");
        assertThat(game.path("metadata").path("gradeLevel").asString()).isEqualTo("GRADE_3");
    }

    @Test
    void moderationOutageIs504WithoutAskingTheAiAgain() throws IOException {
        ContentModerationClient down = mock(ContentModerationClient.class);
        org.mockito.Mockito.when(down.isConfigured()).thenReturn(true);
        org.mockito.Mockito.when(down.moderate(org.mockito.ArgumentMatchers.anyList()))
                .thenThrow(new com.aigameplatform.backend.service.validation.safety.ModerationUnavailableException("timeout"));
        var withOutage = new CpfValidationService(new CpfAssetCatalog(MAPPER),
                new ContentSafetyCheck(new BlockedWordList(List.of("cứt")), down, true), MAPPER);
        var ai = new ScriptedGenerator(example("catch-even-apples"), example("catch-even-apples"));
        var beans = new StaticListableBeanFactory(Map.of("generator", ai));
        var service = new CpfGenerationService(beans.getBeanProvider(CpfContentGenerator.class), withOutage, MAPPER, 2);

        assertThatThrownBy(() -> service.generate(IDEA, Subject.MATH, GradeLevel.GRADE_1))
                .isInstanceOf(AiGenerationTimeoutException.class);
        assertThat(ai.attempts).hasSize(1);
    }

    @Test
    void nullOptionalFieldsFromTheDecoderAreDropped() throws IOException {
        ObjectNode answer = (ObjectNode) MAPPER.readTree(example("fishing-compound-words"));
        ((ObjectNode) answer.get("world")).putNull("mascotId");
        ((ObjectNode) answer.get("entities").get(1)).putNull("motion");
        var ai = new ScriptedGenerator(MAPPER.writeValueAsString(answer));

        JsonNode game = service(ai).generate("Câu cá từ ghép", Subject.VIETNAMESE, GradeLevel.GRADE_2);

        assertThat(game.path("world").has("mascotId")).isFalse();
        assertThat(ai.attempts).hasSize(1);
    }

    @Test
    void fieldsOfOtherActionTypesFromTheDecoderAreDropped() throws IOException {
        // Lỗi gặp khi chạy thật với Gemini: EFFECT/SOUND kèm `add` của SCORE, sai cả 3 lần thử.
        ObjectNode answer = (ObjectNode) MAPPER.readTree(example("race-multiplication"));
        ObjectNode check = (ObjectNode) answer.get("rules").get(0).get("do").get(0);
        ((ObjectNode) check.get("onCorrect").get(1)).put("add", 0); // EFFECT STARS
        ((ObjectNode) check.get("onWrong").get(1)).put("add", 0).put("to", ""); // SOUND GENTLE_WRONG
        ((ObjectNode) check.get("onWrong").get(0)).remove("at"); // EFFECT WIGGLE thiếu at
        var ai = new ScriptedGenerator(MAPPER.writeValueAsString(answer));

        JsonNode game = service(ai).generate(IDEA, Subject.MATH, GradeLevel.GRADE_1);

        JsonNode saved = game.path("rules").get(0).path("do").get(0);
        assertThat(saved.path("onCorrect").get(1).propertyNames()).containsExactlyInAnyOrder("type", "name", "at");
        assertThat(saved.path("onCorrect").get(1).path("at").asString()).isEqualTo("car");
        assertThat(saved.path("onWrong").get(1).propertyNames()).containsExactlyInAnyOrder("type", "name");
        assertThat(saved.path("onWrong").get(0).path("at").asString()).isEqualTo("$subject");
        assertThat(ai.attempts).hasSize(1);
    }

    @Test
    void actionFieldTableMatchesTheSchemaBranches() throws IOException {
        // ACTION_FIELDS chép tay các nhánh oneOf của action/simpleAction: lệch schema thì test này báo.
        JsonNode defs;
        try (var in = getClass().getResourceAsStream("/schema/cpf/2.0.0/cpf-game.schema.json")) {
            defs = MAPPER.readTree(in).path("$defs");
        }
        Map<String, Set<String>> fromSchema = new java.util.HashMap<>();
        for (String def : List.of("action", "simpleAction")) {
            for (JsonNode branch : defs.path(def).path("oneOf")) {
                if (branch.has("$ref")) continue;
                Set<String> fields = new java.util.HashSet<>(branch.path("properties").propertyNames());
                JsonNode type = branch.path("properties").path("type");
                List<JsonNode> types = type.has("const") ? List.of(type.get("const")) : type.path("enum").valueStream().toList();
                types.forEach(t -> fromSchema.put(t.asString(), fields));
            }
        }

        assertThat(CpfGenerationService.ACTION_FIELDS).isEqualTo(fromSchema);
    }

    @Test
    void retriesWithThePreviousOutputAndLocatedErrors() throws IOException {
        String bad = withEntityAsset(example("catch-even-apples"), "fruit.dragonfruit");
        var ai = new ScriptedGenerator(bad, example("catch-even-apples"));

        service(ai).generate(IDEA, Subject.MATH, GradeLevel.GRADE_1);

        assertThat(ai.attempts).hasSize(2);
        CpfGenerationAttempt retry = ai.attempts.get(1);
        assertThat(retry.isRetry()).isTrue();
        assertThat(retry.attemptNumber()).isEqualTo(2);
        assertThat(retry.previousOutput()).isEqualTo(bad);
        assertThat(retry.previousErrors()).anySatisfy(e -> assertThat(e.path()).isEqualTo("$.entities[0].assetId"));
    }

    @Test
    void textThatIsNotJsonIsRetriedLikeAnyInvalidOutput() throws IOException {
        var ai = new ScriptedGenerator("Đây là trò chơi của bạn!", example("catch-even-apples"));

        service(ai).generate(IDEA, Subject.MATH, GradeLevel.GRADE_1);

        assertThat(ai.attempts).hasSize(2);
    }

    @Test
    void givesUpWith504AfterTheRetryBudget() throws IOException {
        String bad = withEntityAsset(example("catch-even-apples"), "fruit.dragonfruit");
        var ai = new ScriptedGenerator(bad, bad, bad, bad);

        assertThatThrownBy(() -> service(ai).generate(IDEA, Subject.MATH, GradeLevel.GRADE_1))
                .isInstanceOf(AiGenerationTimeoutException.class);
        assertThat(ai.attempts).hasSize(3);
    }

    @Test
    void unsafeContentIsRejectedWithoutAnotherAttempt() throws IOException {
        ObjectNode answer = (ObjectNode) MAPPER.readTree(example("catch-even-apples"));
        ((ObjectNode) answer.get("content")).put("instruction", "Hứng cứt");
        var ai = new ScriptedGenerator(MAPPER.writeValueAsString(answer), example("catch-even-apples"));

        assertThatThrownBy(() -> service(ai).generate(IDEA, Subject.MATH, GradeLevel.GRADE_1))
                .isInstanceOf(UnsafeContentException.class);
        assertThat(ai.attempts).hasSize(1);
    }

    @Test
    void aiOutageBecomes504() {
        CpfContentGenerator down = attempt -> {
            throw new AiServiceUnavailableException("timeout");
        };

        assertThatThrownBy(() -> service(down).generate(IDEA, Subject.MATH, GradeLevel.GRADE_1))
                .isInstanceOf(AiGenerationTimeoutException.class);
    }

    @Test
    void missingGeneratorIsReportedNotNpe() {
        assertThatThrownBy(() -> service(null).generate(IDEA, Subject.MATH, GradeLevel.GRADE_1))
                .isInstanceOf(AiGenerationTimeoutException.class);
    }
}
