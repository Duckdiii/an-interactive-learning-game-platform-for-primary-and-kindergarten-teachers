package com.aigameplatform.backend.service.play;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.db.AbstractPostgresTest;
import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.session.GameInsightsDto.CommonWrongDto;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class GameInsightsPersistenceTest extends AbstractPostgresTest {
    @Autowired GameRepository games;
    @Autowired TeacherRepository teachers;
    @Autowired GameContentStrategyRegistry strategies;
    @Autowired StudentPlayService play;
    @Autowired GameInsightsService insights;
    @Autowired JsonMapper mapper;

    @Test
    void aggregatesSavedMemoryCardAndImageClozeMistakes() {
        Teacher teacher = new Teacher();
        teacher.setEmail("insights-" + UUID.randomUUID() + "@example.invalid");
        teacher.setFullName("Insights fixture");
        teacher.setPasswordHash("fixture");
        teachers.saveAndFlush(teacher);
        var principal = new AuthenticatedTeacher(teacher.getId(), teacher.getEmail(), "fixture");
        Game memory = published("memory-card.json", teacher, null);
        Game cloze = published("visual-cloze-image-v1.1.json", teacher, VisualClozeMode.IMAGE);
        for (String nickname : List.of("Ong", "Bướm")) {
            var session = play.start(memory.getShareCode(), nickname);
            assertThat(submit(session, Map.of("matchedPairIds", List.of("p1", "p2"), "flips", 6,
                    "wrongPairs", List.of(List.of("p2", "p1"))))).isEqualTo("CORRECT");

            var imageSession = play.start(cloze.getShareCode(), nickname);
            JsonNode board = play.questions(
                    (String) imageSession.get("sessionId"), (String) imageSession.get("participantId")).path("questions").get(0);
            String blank = board.path("blanks").get(0).path("id").asString();
            String wrong = null;
            String correct = null;
            for (JsonNode option : board.path("options")) {
                if (option.path("visualPrompt").asString().contains("vuông")) wrong = option.path("id").asString();
                else correct = option.path("id").asString();
            }
            assertThat(wrong).isNotNull();
            assertThat(correct).isNotNull();
            assertThat(submit(imageSession, Map.of("placements", List.of(Map.of("blankId", blank, "optionId", wrong)))))
                    .isEqualTo("INCORRECT");
            assertThat(submit(imageSession, Map.of("placements", List.of(Map.of("blankId", blank, "optionId", correct)))))
                    .isEqualTo("CORRECT");
        }

        assertThat(insights.getInsights(memory.getId(), null, null, null, null, principal).questions().getFirst().commonWrong())
                .containsExactly(new CommonWrongDto("apple ↔ chuối", 2));
        assertThat(insights.getInsights(cloze.getId(), null, null, null, null, principal).questions().getFirst().commonWrong())
                .containsExactly(new CommonWrongDto("Ô 1: một hình vuông màu xanh", 2));
    }

    private Object submit(Map<String, Object> session, Map<String, Object> answer) {
        var payload = mapper.createObjectNode().put("questionId", "q1").put("timeSpentMs", 500);
        answer.forEach((key, value) -> payload.set(key, mapper.valueToTree(value)));
        return play.interact((String) session.get("sessionId"), (String) session.get("participantId"), payload).get("status");
    }

    private Game published(String fixture, Teacher teacher, VisualClozeMode mode) {
        var dsl = mapper.readValue(getClass().getResourceAsStream("/dsl-examples/" + fixture), GameDsl.class);
        Game game = new Game();
        game.setAuthor(teacher);
        game.setTitle(dsl.metadata().title());
        game.setTopic(dsl.metadata().topic());
        game.setGrade(dsl.metadata().gradeLevel());
        game.setSubject(dsl.metadata().subject());
        game.setGameType(dsl.gameType());
        game.setSchemaVersion(dsl.schemaVersion());
        game.setVisualClozeMode(mode);
        game.setShareCode(UUID.randomUUID().toString().substring(0, 6));
        game.setStatus(GameStatus.PUBLISHED);
        game.setQuestionNum(dsl.questions().size());
        game.setQuestions(strategies.get(dsl.gameType()).parseToQuestions(dsl));
        return games.saveAndFlush(game);
    }
}
