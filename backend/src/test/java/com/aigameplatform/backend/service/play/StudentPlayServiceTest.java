package com.aigameplatform.backend.service.play;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.VisualClozeBlankDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeImageOptionDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeQuestionDsl;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.entity.question.VisualClozeQuestion;
import com.aigameplatform.backend.entity.question.embedded.VisualClozeBlank;
import com.aigameplatform.backend.entity.question.embedded.VisualClozeImageOption;
import com.aigameplatform.backend.entity.session.Participant;
import com.aigameplatform.backend.entity.session.SelfSession;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.SelfSessionRepository;
import com.aigameplatform.backend.service.strategy.GameContentStrategy;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class StudentPlayServiceTest {
    private static final String SALT = "test-session-salt";
    private final GameRepository games = mock(GameRepository.class);
    private final SelfSessionRepository sessions = mock(SelfSessionRepository.class);
    private final GameContentStrategyRegistry strategies = mock(GameContentStrategyRegistry.class);
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final GameContentStrategy strategy = mock(GameContentStrategy.class);
    private final StudentPlayService service = new StudentPlayService(games, sessions, strategies, mapper);
    private SelfSession session;
    private Participant participant;
    private VisualClozeQuestion question;

    @BeforeEach
    void setUp() {
        when(strategies.get(GameType.VISUAL_CLOZE)).thenReturn(strategy);
        question = new VisualClozeQuestion();
        question.setId("db-question");
        question.setItemIndex(0);
        question.setTimeLimit(30);
        question.setPoint(100);
        question.setQuestionText("Find the cat");
        question.setImageUrl("https://scene.example/scene.png");
        question.setSceneWidth(1000);
        question.setSceneHeight(800);
        question.setBlanks(List.of(new VisualClozeBlank("blank1", 200, 200, "cat")));
        question.setOptions(List.of(new VisualClozeImageOption("cat", "cat", "https://images.example/cat.png"),
                new VisualClozeImageOption("dog", "dog", "https://images.example/dog.png")));

        Game game = new Game();
        game.setId("game");
        game.setGameType(GameType.VISUAL_CLOZE);
        game.setTitle("Animals");
        game.setSubject(Subject.MATH);
        game.setGrade(GradeLevel.GRADE_1);
        game.setStatus(GameStatus.PUBLISHED);
        game.setSchemaVersion("1.1.0");
        game.setVisualClozeMode(VisualClozeMode.IMAGE);
        game.setQuestionNum(1);
        game.setQuestions(List.of(question));

        participant = new Participant();
        participant.setId("participant");
        participant.setStudentNickname("Mia");
        session = new SelfSession();
        session.setId("session");
        session.setGame(game);
        session.setStudentOptionSalt(SALT);
        session.setStatus(com.aigameplatform.backend.entity.enums.SessionStatus.ACTIVE);
        session.setSessionExpiresAt(LocalDateTime.now().plusHours(1));
        session.setParticipants(List.of(participant));
        when(sessions.findById("session")).thenReturn(java.util.Optional.of(session));
        when(sessions.findByIdForUpdate("session")).thenReturn(java.util.Optional.of(session));
        when(sessions.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        var qdsl = new VisualClozeQuestionDsl("q1", 30, 100, null, null, null, null, null, null, null,
                "Find the cat", "https://scene.example/scene.png", 1000, 800,
                List.of(new VisualClozeBlankDsl("blank1", 200, 200, "cat")),
                List.of(new VisualClozeImageOptionDsl("cat", "cat", "https://images.example/cat.png"),
                        new VisualClozeImageOptionDsl("dog", "dog", "https://images.example/dog.png")));
        var dsl = new VisualClozeGameDsl("1.1.0", GameType.VISUAL_CLOZE, VisualClozeMode.IMAGE,
                new GameMetadata("Animals", Subject.MATH, GradeLevel.GRADE_1, "Animals"),
                new GameplaySettings(1.5), List.of(qdsl));
        when(strategy.toGameDsl(game)).thenReturn(dsl);
    }

    @Test
    void studentImageQuestionOmitsCorrectMappingsAndUsesOpaqueIds() {
        var body = service.questions("session", "participant");

        assertThat(body.toString()).doesNotContain("correctOptionId").doesNotContain("\"id\":\"cat\"");
        assertThat(body.get("questions").get(0).get("blanks").get(0).get("id").asString()).startsWith("x");
        assertThat(body.get("questions").get(0).get("options").get(0).get("id").asString()).startsWith("x");
        assertThat(body.get("answeredQuestionIds").isArray()).isTrue();
    }

    @Test
    void wrongImagePlacementDoesNotRevealAnswerAndAllowsRetry() throws Exception {
        String blank = opaque("blank:blank1");
        String correct = opaque("option:cat");
        String wrong = opaque("option:dog");
        var wrongResult = service.interact("session", "participant", mapper.readTree("""
                {"questionId":"q1","timeSpentMs":4000,"placements":[{"blankId":"%s","optionId":"%s"}]}
                """.formatted(blank, wrong)));

        assertThat(wrongResult.get("status")).isEqualTo("INCORRECT");
        assertThat(wrongResult.get("retryable")).isEqualTo(true);
        assertThat(wrongResult.get("placementCorrect")).isEqualTo(false);
        assertThat(wrongResult.get("pointsEarned")).isEqualTo(0);
        assertThat(wrongResult.get("correctAnswer")).isNull();
        assertThat(participant.getCompletedAt()).isNull();

        var retried = service.interact("session", "participant", mapper.readTree("""
                {"questionId":"q1","timeSpentMs":1000,"placements":[{"blankId":"%s","optionId":"%s"}]}
                """.formatted(blank, correct)));
        assertThat(retried.get("status")).isEqualTo("CORRECT");
        assertThat(retried.get("correctAnswer").toString()).contains(correct).contains(blank);
        assertThat(((Number) retried.get("totalScore")).intValue()).isGreaterThan(0);
        assertThat(participant.getPlayInteractionDetails()).hasSize(1);
    }

    @Test
    void correctImagePlacementsPersistUntilEveryBlankIsFilled() throws Exception {
        question.setBlanks(List.of(new VisualClozeBlank("blank1", 200, 200, "cat"),
                new VisualClozeBlank("blank2", 500, 300, "dog")));
        String blank1 = opaque("blank:blank1");
        String blank2 = opaque("blank:blank2");
        String cat = opaque("option:cat");
        String dog = opaque("option:dog");

        var partial = service.interact("session", "participant", mapper.readTree("""
                {"questionId":"q1","timeSpentMs":3000,"placements":[{"blankId":"%s","optionId":"%s"}]}
                """.formatted(blank1, cat)));

        assertThat(partial.get("status")).isEqualTo("IN_PROGRESS");
        assertThat(partial.get("placementCorrect")).isEqualTo(true);
        assertThat(partial.get("correctAnswer")).isNull();
        assertThat(participant.getCompletedAt()).isNull();

        var complete = service.interact("session", "participant", mapper.readTree("""
                {"questionId":"q1","timeSpentMs":5000,"placements":[{"blankId":"%s","optionId":"%s"}]}
                """.formatted(blank2, dog)));

        assertThat(complete.get("status")).isEqualTo("CORRECT");
        assertThat(complete.get("correctAnswer").toString()).contains(blank1, blank2, cat, dog);
        assertThat(participant.getCompletedAt()).isNotNull();
    }

    @Test
    void inProgressImageQuestionRestoresConfirmedPlacementsWithoutMarkingAnswered() throws Exception {
        question.setBlanks(List.of(new VisualClozeBlank("blank1", 200, 200, "cat"),
                new VisualClozeBlank("blank2", 500, 300, "dog")));
        String blank = opaque("blank:blank1");
        String cat = opaque("option:cat");
        service.interact("session", "participant", mapper.readTree("""
                {"questionId":"q1","timeSpentMs":3000,"placements":[{"blankId":"%s","optionId":"%s"}]}
                """.formatted(blank, cat)));

        var body = service.questions("session", "participant");
        var questionNode = body.get("questions").get(0);
        assertThat(questionNode.get("acceptedPlacements")).as(body.toPrettyString()).isNotNull();
        assertThat(questionNode.get("acceptedPlacements").get(0).get("blankId").asString()).isEqualTo(blank);
        assertThat(questionNode.get("acceptedPlacements").get(0).get("optionId").asString()).isEqualTo(cat);
        assertThat(questionNode.get("elapsedTimeMs").asInt()).isEqualTo(3000);
        assertThat(body.get("answeredQuestionIds")).isEmpty();
    }

    @Test
    void imagePlacementRejectsPartialOrReusedOptions() throws Exception {
        String blank = opaque("blank:blank1");
        assertThatThrownBy(() -> service.interact("session", "participant", mapper.readTree("""
                {"questionId":"q1","timeSpentMs":1000,"placements":[]}
                """)))
                .hasMessageContaining("placements");
        assertThatThrownBy(() -> service.interact("session", "someone-else", mapper.readTree("{}")))
                .hasMessageContaining("Participant");
    }

    @Test
    void skippedImageQuestionDoesNotRevealCorrectMapping() throws Exception {
        var result = service.interact("session", "participant", mapper.readTree("""
                {"questionId":"q1","timeSpentMs":1000,"outcome":"SKIPPED"}
                """));

        assertThat(result.get("status")).isEqualTo("SKIPPED");
        assertThat(result.get("correctAnswer")).isNull();
        assertThat(result.toString()).doesNotContain("cat").doesNotContain("blank1");
    }

    private String opaque(String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SALT.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] bytes = mac.doFinal(("0|" + value).getBytes(StandardCharsets.UTF_8));
        return "x" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes).substring(0, 20);
    }
}
