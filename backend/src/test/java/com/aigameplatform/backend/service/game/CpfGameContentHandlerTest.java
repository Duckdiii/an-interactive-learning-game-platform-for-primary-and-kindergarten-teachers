package com.aigameplatform.backend.service.game;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.question.CpfQuestion;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.exception.UnsafeContentException;
import com.aigameplatform.backend.service.generation.cpf.CpfGenerationService;
import com.aigameplatform.backend.service.validation.ContentSafetyCheck;
import com.aigameplatform.backend.service.validation.cpf.CpfAssetCatalog;
import com.aigameplatform.backend.service.validation.cpf.CpfValidationService;
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import com.aigameplatform.backend.service.validation.safety.ContentModerationClient;
import java.io.InputStream;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Handler CPF với chuỗi kiểm duyệt thật; AI được thay bằng mock (không gọi Gemini). */
class CpfGameContentHandlerTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private final CpfGenerationService generation = mock(CpfGenerationService.class);
    private final CpfValidationService validation = new CpfValidationService(new CpfAssetCatalog(MAPPER),
            new ContentSafetyCheck(new BlockedWordList(List.of("cứt")), mock(ContentModerationClient.class), false), MAPPER);
    private final CpfGameContentHandler handler = new CpfGameContentHandler(generation, validation, MAPPER);

    private static ObjectNode example(String name) throws Exception {
        try (InputStream in = CpfGameContentHandlerTest.class.getResourceAsStream("/cpf-examples/" + name + ".json")) {
            return (ObjectNode) MAPPER.readTree(in);
        }
    }

    private Game storedGame() throws Exception {
        Game game = new Game();
        game.setGameType(GameType.CUSTOM);
        game.getQuestions().addAll(handler.generate(GameType.CUSTOM, "x", Subject.MATH, GradeLevel.GRADE_1).questions());
        return game;
    }

    @Test
    void handlesOnlyCustom() {
        assertThat(handler.handles(GameType.CUSTOM)).isTrue();
        assertThat(handler.handles(GameType.QUIZ)).isFalse();
    }

    @Test
    void generatedGameIsOneCpfQuestionHoldingTheWholeJson() throws Exception {
        when(generation.generate("ý tưởng", Subject.MATH, GradeLevel.GRADE_1)).thenReturn(example("catch-even-apples"));

        var content = handler.generate(GameType.CUSTOM, "ý tưởng", Subject.MATH, GradeLevel.GRADE_1);

        assertThat(content.title()).isEqualTo("Hứng táo số chẵn");
        assertThat(content.schemaVersion()).isEqualTo("2.0.0");
        assertThat(content.questions()).singleElement().isInstanceOf(CpfQuestion.class);
        assertThat(MAPPER.readTree(((CpfQuestion) content.questions().get(0)).getPayload()))
                .isEqualTo(example("catch-even-apples"));
    }

    @Test
    void responseNestsTheGameUnderCpfNextToManagementFields() throws Exception {
        when(generation.generate("x", Subject.MATH, GradeLevel.GRADE_1)).thenReturn(example("catch-even-apples"));
        Game game = storedGame();
        ObjectNode management = MAPPER.createObjectNode().put("gameId", "g").put("status", "DRAFT").put("updatedAt", "t");

        JsonNode response = handler.toResponse(game, management);

        assertThat(response.path("gameType").asString()).isEqualTo("CUSTOM");
        assertThat(response.path("gameId").asString()).isEqualTo("g");
        assertThat(response.path("cpf").path("kind").asString()).isEqualTo("CPF");
        assertThat(management.has("cpf")).as("không sửa object đầu vào").isFalse();
    }

    @Test
    void teacherEditReplacesTheJsonAndCopiesTitleSubjectAndGrade() throws Exception {
        when(generation.generate("x", Subject.MATH, GradeLevel.GRADE_1)).thenReturn(example("catch-even-apples"));
        Game game = storedGame();

        handler.replaceContent(game, example("sort-land-water-animals"));

        assertThat(game.getTitle()).isEqualTo("Con vật ở đâu?");
        assertThat(game.getSubject()).isEqualTo(Subject.VIETNAMESE);
        assertThat(game.getGrade()).isEqualTo(GradeLevel.KINDERGARTEN);
        assertThat(game.getQuestions()).singleElement().satisfies(q ->
                assertThat(MAPPER.readTree(((CpfQuestion) q).getPayload()).path("metadata").path("title").asString())
                        .isEqualTo("Con vật ở đâu?"));
    }

    @Test
    void invalidEditIs400AndKeepsTheOldContent() throws Exception {
        when(generation.generate("x", Subject.MATH, GradeLevel.GRADE_1)).thenReturn(example("catch-even-apples"));
        Game game = storedGame();
        String before = ((CpfQuestion) game.getQuestions().get(0)).getPayload();
        ObjectNode broken = example("catch-even-apples");
        ((ObjectNode) broken.get("entities").get(0)).put("assetId", "fruit.dragonfruit");

        assertThatThrownBy(() -> handler.replaceContent(game, broken))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
        assertThat(((CpfQuestion) game.getQuestions().get(0)).getPayload()).isEqualTo(before);
    }

    @Test
    void unsafeEditIs422() throws Exception {
        ObjectNode unsafe = example("catch-even-apples");
        ((ObjectNode) unsafe.get("content")).put("instruction", "Hứng cứt");

        assertThatThrownBy(() -> handler.replaceContent(new Game(), unsafe)).isInstanceOf(UnsafeContentException.class);
    }

    @Test
    void dslBodyForACustomGameIsRejected() throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/dsl-examples/quiz.json")) {
            JsonNode dsl = MAPPER.readTree(in);
            assertThatThrownBy(() -> handler.replaceContent(new Game(), dsl)).isInstanceOf(ApiException.class);
        }
    }

    @Test
    void reviseSendsTheCurrentGameAndTheRequestToTheAiAndReturnsTheRevisedCpf() throws Exception {
        ObjectNode current = MAPPER.createObjectNode().put("gameId", "g").put("gameType", "CUSTOM");
        current.set("cpf", example("catch-even-apples"));
        var revision = org.mockito.ArgumentCaptor.forClass(com.aigameplatform.backend.service.generation.Revision.class);
        when(generation.generate(org.mockito.ArgumentMatchers.eq("Số chẵn trong phạm vi 10"), org.mockito.ArgumentMatchers.eq(Subject.MATH),
                org.mockito.ArgumentMatchers.eq(GradeLevel.GRADE_1), revision.capture())).thenReturn(example("race-multiplication"));

        ObjectNode revised = handler.revise(current, "thêm 1 màn", List.of());

        assertThat(revised.path("gameType").asString()).isEqualTo("CUSTOM");
        assertThat(revised.path("cpf")).isEqualTo(example("race-multiplication"));
        assertThat(revised.has("gameId")).isFalse();
        assertThat(revision.getValue().currentGame()).contains("Hứng táo số chẵn");
        assertThat(revision.getValue().instruction()).isEqualTo("thêm 1 màn");
    }
}
