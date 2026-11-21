package com.aigameplatform.backend.service.play;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.entity.question.OddOneOutQuestion;
import com.aigameplatform.backend.entity.question.embedded.OddOneOutImageItem;
import com.aigameplatform.backend.entity.session.Participant;
import com.aigameplatform.backend.entity.session.SelfSession;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.SelfSessionRepository;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.strategy.OddOneOutGameStrategy;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class StudentPlayOddImageServiceTest {
    private final GameRepository games = mock(GameRepository.class);
    private final SelfSessionRepository sessions = mock(SelfSessionRepository.class);
    private final GameContentStrategyRegistry strategies = mock(GameContentStrategyRegistry.class);
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final StudentPlayService service = new StudentPlayService(games, sessions, strategies, mapper);
    private Participant participant;

    @BeforeEach
    void setup() {
        var question = new OddOneOutQuestion();
        question.setId("db-q1");
        question.setItemIndex(0);
        question.setTimeLimit(30);
        question.setPoint(100);
        question.setQuestionText("Hình nào không phải trái cây?");
        question.setOddOneOutId("d");
        question.setImageItems(List.of(item("apple", "Táo"), item("banana", "Chuối"),
                item("grapes", "Nho"), item("carrot", "Cà rốt")));
        var game = new Game();
        game.setGameType(GameType.ODD_ONE_OUT);
        game.setOddOneOutMode(OddOneOutMode.IMAGE);
        game.setSchemaVersion("1.1.0");
        game.setTitle("Trái cây");
        game.setSubject(Subject.VIETNAMESE);
        game.setGrade(GradeLevel.GRADE_1);
        game.setStatus(GameStatus.PUBLISHED);
        game.setQuestionNum(1);
        game.setQuestions(List.of(question));
        participant = new Participant();
        participant.setId("participant");
        var session = new SelfSession();
        session.setId("session");
        session.setGame(game);
        session.setStudentOptionSalt("secret-salt");
        session.setStatus(SessionStatus.ACTIVE);
        session.setSessionExpiresAt(LocalDateTime.now().plusHours(1));
        session.setParticipants(List.of(participant));
        doReturn(new OddOneOutGameStrategy(mapper)).when(strategies).get(GameType.ODD_ONE_OUT);
        when(sessions.findById("session")).thenReturn(Optional.of(session));
        when(sessions.findByIdForUpdate("session")).thenReturn(Optional.of(session));
        when(sessions.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private OddOneOutImageItem item(String id, String text) {
        return new OddOneOutImageItem(id, text, "/assets/noto/" + id + ".svg");
    }

    private JsonNode question() { return service.questions("session", "participant").get("questions").get(0); }

    private String idFor(String label) {
        for (JsonNode item : question().get("items")) {
            if (label.equals(item.get("text").asString())) return item.get("id").asString();
        }
        throw new AssertionError("Missing item");
    }

    @Test
    void studentSeesCriterionAndStableImagesWithoutAnswerKey() {
        JsonNode question = question();
        assertThat(question.path("renderMode").asString()).isEqualTo("IMAGE");
        assertThat(question.path("questionText").asString()).isEqualTo("Hình nào không phải trái cây?");
        assertThat(question.has("oddOneOutId")).isFalse();
        assertThat(question.path("items").size()).isEqualTo(4);
        assertThat(question.path("items").toString()).isEqualTo(question().path("items").toString());
        assertThat(question.path("items").get(0).path("id").asString()).startsWith("x");
    }

    @Test
    void wrongAnswerRevealsCorrectIdAndCannotBeRegraded() {
        String wrong = idFor("Táo");
        String correct = idFor("Cà rốt");
        var request = mapper.readTree("""
                {"questionId":"q1","timeSpentMs":1000,"selectedItemId":"%s"}
                """.formatted(wrong));
        var result = service.interact("session", "participant", request);
        assertThat(result.get("status")).isEqualTo("INCORRECT");
        assertThat(((JsonNode) result.get("correctAnswer")).path("selectedItemId").asString()).isEqualTo(correct);
        assertThat(service.interact("session", "participant", request).get("totalScore")).isEqualTo(0);
        assertThat(participant.getPlayInteractionDetails()).hasSize(1);
    }

    @Test
    void correctAnswerScoresAndUnknownIdIsRejected() {
        assertThatThrownBy(() -> service.interact("session", "participant", mapper.readTree("""
                {"questionId":"q1","timeSpentMs":1000,"selectedItemId":"unknown"}
                """))).isInstanceOf(ApiException.class);
        String correct = idFor("Cà rốt");
        var result = service.interact("session", "participant", mapper.readTree("""
                {"questionId":"q1","timeSpentMs":1000,"selectedItemId":"%s"}
                """.formatted(correct)));
        assertThat(result.get("status")).isEqualTo("CORRECT");
        assertThat(((Number) result.get("totalScore")).intValue()).isGreaterThan(0);
    }
}
