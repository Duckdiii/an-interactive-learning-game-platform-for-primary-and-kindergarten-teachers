package com.aigameplatform.backend.service.generation;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.OddOneOutMode;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.service.factory.OddOneOutGameDslFactory;
import com.aigameplatform.backend.service.validation.ai.AiOutputValidator;
import java.util.Random;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class OddOneOutImageAiTest {
    private final AiOutputValidator validator = new AiOutputValidator(JsonMapper.builder().build());

    @Test
    void validAiIdsBecomeCatalogBackedImageQuestion() {
        String json = """
                {"questions":[{"questionText":"Hình nào không phải trái cây?",
                  "items":["apple","banana","grapes","carrot"],"oddOneOutIndex":3}]}
                """;
        var output = validator.validate(GameType.ODD_ONE_OUT, json, true);
        assertThat(output.valid()).isTrue();
        var request = new GameDslRequest("Trái cây", Subject.VIETNAMESE, GradeLevel.GRADE_1,
                null, null, VisualClozeMode.IMAGE, null, null);
        OddOneOutGameDsl game = new OddOneOutGameDslFactory(new Random(4)).createImage(output.output(), request);
        assertThat(game.mode()).isEqualTo(OddOneOutMode.IMAGE);
        var question = game.questions().getFirst();
        assertThat(question.questionText()).isEqualTo("Hình nào không phải trái cây?");
        assertThat(question.items()).hasSize(4).allSatisfy(item -> {
            assertThat(item.assetId()).isNotBlank();
            assertThat(item.imageUrl()).startsWith("/assets/noto/");
        });
        assertThat(question.items().stream().filter(item -> item.id().equals(question.oddOneOutId())).findFirst().orElseThrow().assetId())
                .isEqualTo("carrot");
    }

    @Test
    void aiImageOutputMustContainAQuestionAndAtLeastFourItems() {
        assertThat(validator.validate(GameType.ODD_ONE_OUT,
                """
                {"questions":[{"items":["apple","banana","carrot"],"oddOneOutIndex":2}]}
                """, true).valid()).isFalse();
    }
}
