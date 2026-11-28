package com.aigameplatform.backend.flow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.dto.understanding.ChatTurn;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.generation.GenerationAttempt;
import com.aigameplatform.backend.service.generation.Revision;
import com.aigameplatform.backend.service.generation.cpf.CpfGenerationAttempt;
import com.aigameplatform.backend.service.validation.ai.AiOutputValidator;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class FakeAiConfigurationTest {
    private final JsonMapper json = JsonMapper.builder().build();

    @ParameterizedTest
    @EnumSource(value = GameType.class, mode = EnumSource.Mode.EXCLUDE, names = "CUSTOM")
    void generatedFixtureMatchesTheRequestedRendererSchema(GameType type) {
        String output = new FakeAiConfiguration().fakeGameContentGenerator().generate(new GenerationAttempt(
                type, "Browser fixture", null, null, null, null, 1, null, List.of()));
        assertThat(new AiOutputValidator(json).validate(type, output).errors()).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"fishing-compound-words", "catch-even-apples", "archery-addition",
            "rabbit-pick-carrots", "sort-land-water-animals", "race-multiplication"})
    void cpfBrowserFixtureRetainsItsPublishedControlsAndMotion(String name) throws Exception {
        String output = new FakeAiConfiguration().fakeCpfContentGenerator().generate(new CpfGenerationAttempt(
                "E2E CPF: " + name, null, null, 1, null, List.of()));
        try (var in = getClass().getResourceAsStream("/cpf-examples/" + name + ".json")) {
            assertThat(json.readTree(output)).isEqualTo(json.readTree(in));
        }
    }

    @Test void unknownCpfBrowserScenarioCannotSilentlyReturnFishing() {
        assertThatThrownBy(() -> new FakeAiConfiguration().fakeCpfContentGenerator().generate(new CpfGenerationAttempt(
                "E2E CPF: ../../secret", null, null, 1, null, List.of())))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test void unsupportedInstructionCannotReturnASuccessMarker() throws Exception {
        assertThatThrownBy(() -> generate(game(), "x", List.of())).isInstanceOf(IllegalArgumentException.class);
    }

    @Test void revisionUsesTheCurrentGameAndLeavesUnmentionedQuestionUntouched() throws Exception {
        ObjectNode current = (ObjectNode) json.readTree(game());
        ((ObjectNode) current.path("questions").get(0)).put("questionText", "Câu đầu đã được giáo viên chỉnh.");
        String output = generate(json.writeValueAsString(current), "Đổi con chó thành con gà", List.of());
        assertThat(json.readTree(output).path("questions").get(0).path("text").asString())
                .isEqualTo("Câu đầu đã được giáo viên chỉnh.");
        assertThat(output).contains("con gà");
    }

    @Test void aHistoryDependentInstructionFailsIfHistoryIsDroppedOrAltered() throws Exception {
        String instruction = "Theo yêu cầu trước, đổi con chó thành con gà";
        var history = List.of(new ChatTurn(ChatTurn.Role.TEACHER, "Chỉ sửa câu thứ hai, giữ nguyên câu đầu"));
        assertThat(generate(game(), instruction, history)).contains("con gà");
        assertThatThrownBy(() -> generate(game(), instruction, List.of())).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> generate(game(), instruction,
                List.of(new ChatTurn(ChatTurn.Role.TEACHER, "x")))).isInstanceOf(IllegalArgumentException.class);
    }

    private String generate(String game, String instruction, List<ChatTurn> history) {
        return new FakeAiConfiguration().fakeGameContentGenerator().generate(new GenerationAttempt(
                null, null, null, null, null, null, 1, null, List.of(),
                new Revision(game, instruction, history, Revision.DSL_FORMAT)));
    }

    private String game() throws Exception {
        try (var in = getClass().getResourceAsStream("/dsl-examples/quiz.json")) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
