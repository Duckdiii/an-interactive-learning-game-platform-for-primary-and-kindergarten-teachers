package com.aigameplatform.backend.service.strategy;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl;
import com.aigameplatform.backend.dto.dsl.OddOneOutQuestionDsl;
import com.aigameplatform.backend.dto.dsl.TextChoiceDsl;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.OddOneOutMode;
import com.aigameplatform.backend.entity.enums.Subject;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class OddOneOutImageMappingTest {
    private final JsonMapper mapper = JsonMapper.builder().build();

    @Test
    void imageQuestionSurvivesDslEntityRoundTrip() {
        var items = List.of(
                new TextChoiceDsl("a", "Táo", "apple", "/assets/noto/emoji_u1f34e.svg"),
                new TextChoiceDsl("b", "Chuối", "banana", "/assets/noto/emoji_u1f34c.svg"),
                new TextChoiceDsl("c", "Nho", "grapes", "/assets/noto/emoji_u1f347.svg"),
                new TextChoiceDsl("d", "Cà rốt", "carrot", "/assets/noto/emoji_u1f955.svg"));
        var question = new OddOneOutQuestionDsl("q1", 30, 10, null, null, null, null,
                items, "d", "Hình nào không phải trái cây?");
        var input = new OddOneOutGameDsl("1.1.0", GameType.ODD_ONE_OUT, OddOneOutMode.IMAGE,
                new GameMetadata("Trái cây", Subject.VIETNAMESE, GradeLevel.GRADE_1, "Trái cây"),
                new GameplaySettings(1), List.of(question));
        var strategy = new OddOneOutGameStrategy(mapper);
        var game = new Game();
        game.setGameType(GameType.ODD_ONE_OUT);
        game.setTitle("Trái cây");
        game.setSubject(Subject.VIETNAMESE);
        game.setGrade(GradeLevel.GRADE_1);
        game.setSchemaVersion("1.1.0");
        game.setOddOneOutMode(OddOneOutMode.IMAGE);
        game.setQuestions(strategy.parseToQuestions(input));

        var result = (OddOneOutGameDsl) strategy.toGameDsl(game);
        assertThat(result.mode()).isEqualTo(OddOneOutMode.IMAGE);
        assertThat(result.questions().getFirst().questionText()).isEqualTo(question.questionText());
        assertThat(result.questions().getFirst().items()).isEqualTo(items);
        assertThat(result.questions().getFirst().oddOneOutId()).isEqualTo("d");
    }
}
