package com.aigameplatform.backend.service.play;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.entity.question.DragDropQuestion;
import com.aigameplatform.backend.entity.question.OrderStep;
import com.aigameplatform.backend.entity.question.OrderingQuestion;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.embedded.DraggableItem;
import com.aigameplatform.backend.entity.question.embedded.DropZone;
import com.aigameplatform.backend.entity.session.Participant;
import com.aigameplatform.backend.entity.session.SelfSession;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.GameSessionRepository;
import com.aigameplatform.backend.repository.ParticipantRepository;
import com.aigameplatform.backend.repository.SelfSessionRepository;
import com.aigameplatform.backend.service.play.insight.DragDropWrongAnswerLabeler;
import com.aigameplatform.backend.service.play.insight.OrderingWrongAnswerLabeler;
import com.aigameplatform.backend.service.strategy.DragDropGameStrategy;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.strategy.OrderingGameStrategy;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Ordering và Drag &amp; Drop qua API học sinh: không lộ đáp án, chấm đúng hết hoặc không, nhãn lỗi cho thống kê. */
class StudentPlayOrderingDragDropServiceTest {

    private final GameRepository games = mock(GameRepository.class);
    private final SelfSessionRepository sessions = mock(SelfSessionRepository.class);
    private final GameSessionRepository liveSessions = mock(GameSessionRepository.class);
    private final ParticipantRepository participants = mock(ParticipantRepository.class);
    private final GameContentStrategyRegistry strategies = mock(GameContentStrategyRegistry.class);
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final StudentPlayService service =
            StudentPlayTestSupport.service(games, sessions, liveSessions, participants, strategies, mapper);
    private Participant participant;

    private void start(GameType type, QuestionGame question) {
        question.setId("db-q1");
        question.setItemIndex(0);
        question.setTimeLimit(30);
        question.setPoint(100);
        Game game = new Game();
        game.setGameType(type);
        game.setSchemaVersion("1.1.0");
        game.setTitle("Thử");
        game.setSubject(Subject.VIETNAMESE);
        game.setGrade(GradeLevel.GRADE_1);
        game.setStatus(GameStatus.PUBLISHED);
        game.setQuestionNum(1);
        game.setQuestions(List.of(question));
        participant = new Participant();
        participant.setId("participant");
        SelfSession session = new SelfSession();
        session.setId("session");
        session.setGame(game);
        session.setStudentOptionSalt("secret-salt");
        session.setStatus(SessionStatus.ACTIVE);
        session.setSessionExpiresAt(LocalDateTime.now().plusHours(1));
        session.setParticipants(List.of(participant));
        doReturn(type == GameType.ORDERING ? new OrderingGameStrategy(mapper) : new DragDropGameStrategy(mapper))
                .when(strategies).get(type);
        when(sessions.findById("session")).thenReturn(Optional.of(session));
        when(sessions.findByIdForUpdate("session")).thenReturn(Optional.of(session));
        when(sessions.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private OrderingQuestion ordering() {
        OrderingQuestion question = new OrderingQuestion();
        List<OrderStep> steps = new java.util.ArrayList<>();
        String[] texts = {"Thức dậy", "Đánh răng", "Ăn sáng"};
        for (int i = 0; i < texts.length; i++) {
            OrderStep step = new OrderStep();
            step.setText(texts[i]);
            step.setCorrectPosition(i + 1);
            steps.add(step);
        }
        question.setSteps(steps);
        return question;
    }

    private DragDropQuestion dragDrop() {
        DragDropQuestion question = new DragDropQuestion();
        question.setDropZones(List.of(zone("z1", "Vùng cá"), zone("z2", "Vùng chim")));
        question.setItems(List.of(item("i1", "Cá", "z1"), item("i2", "Chim", "z2")));
        return question;
    }

    private DropZone zone(String id, String label) {
        DropZone zone = new DropZone();
        zone.setZoneId(id);
        zone.setLabel(label);
        return zone;
    }

    private DraggableItem item(String id, String text, String target) {
        DraggableItem item = new DraggableItem();
        item.setItemId(id);
        item.setText(text);
        item.setTargetZoneId(target);
        return item;
    }

    private JsonNode submit(String body) {
        return mapper.valueToTree(service.interact("session", "participant", mapper.readTree(body)));
    }

    /** Id bước theo chữ, đúng như học sinh thấy. */
    private String stepId(String text) {
        for (JsonNode step : service.questions("session", "participant").get("questions").get(0).get("steps"))
            if (text.equals(step.get("text").asString())) return step.get("id").asString();
        throw new AssertionError("Missing step");
    }

    @Test
    void orderingStudentViewHidesPositionsAndCorrectOrderScores() {
        start(GameType.ORDERING, ordering());
        for (JsonNode step : service.questions("session", "participant").get("questions").get(0).get("steps"))
            assertThat(step.has("correctPosition")).isFalse();

        JsonNode result = submit("""
                {"questionId":"q1","timeSpentMs":1000,"order":["%s","%s","%s"]}
                """.formatted(stepId("Thức dậy"), stepId("Đánh răng"), stepId("Ăn sáng")));

        assertThat(result.get("status").asString()).isEqualTo("CORRECT");
        assertThat(result.get("totalScore").asInt()).isGreaterThan(0);
    }

    @Test
    void orderingWrongOrderIsIncorrectRevealsTheKeyAndGetsALabel() {
        OrderingQuestion question = ordering();
        start(GameType.ORDERING, question);

        JsonNode result = submit("""
                {"questionId":"q1","timeSpentMs":1000,"order":["%s","%s","%s"]}
                """.formatted(stepId("Đánh răng"), stepId("Thức dậy"), stepId("Ăn sáng")));

        assertThat(result.get("status").asString()).isEqualTo("INCORRECT");
        assertThat(result.get("correctAnswer").get("order").size()).isEqualTo(3);
        String answerJson = participant.getPlayInteractionDetails().get(0).getAnswerJson();
        assertThat(new OrderingWrongAnswerLabeler().label(question, 0, "secret-salt", mapper.readTree(answerJson)))
                .contains("Vị trí 1: Đánh răng");
    }

    @Test
    void orderingRejectsMissingOrDuplicateOrUnknownSteps() {
        start(GameType.ORDERING, ordering());
        String a = stepId("Thức dậy");

        for (String order : List.of("[\"" + a + "\"]", "[\"" + a + "\",\"" + a + "\",\"" + a + "\"]",
                "[\"zz\",\"yy\",\"xx\"]", "\"s1\"")) {
            assertThatThrownBy(() -> submit("{\"questionId\":\"q1\",\"timeSpentMs\":1000,\"order\":" + order + "}"))
                    .isInstanceOf(ApiException.class);
        }
        assertThat(participant.getPlayInteractionDetails()).isEmpty();
    }

    @Test
    void dragDropStudentViewHidesTargetZones() {
        start(GameType.DRAG_DROP, dragDrop());

        for (JsonNode item : service.questions("session", "participant").get("questions").get(0).get("items"))
            assertThat(item.has("targetZoneId")).isFalse();
    }

    @Test
    void dragDropAllCorrectScoresAndMissingItemIsIncorrect() {
        start(GameType.DRAG_DROP, dragDrop());
        JsonNode partial = submit("""
                {"questionId":"q1","timeSpentMs":1000,"placements":[{"itemId":"i1","zoneId":"z1"}]}
                """);
        assertThat(partial.get("status").asString()).isEqualTo("INCORRECT");

        start(GameType.DRAG_DROP, dragDrop());
        JsonNode all = submit("""
                {"questionId":"q1","timeSpentMs":1000,"placements":[{"itemId":"i1","zoneId":"z1"},{"itemId":"i2","zoneId":"z2"}]}
                """);
        assertThat(all.get("status").asString()).isEqualTo("CORRECT");
    }

    @Test
    void dragDropWrongZoneGetsALabelAndBadInputIsRejected() {
        DragDropQuestion question = dragDrop();
        start(GameType.DRAG_DROP, question);

        JsonNode wrong = submit("""
                {"questionId":"q1","timeSpentMs":1000,"placements":[{"itemId":"i1","zoneId":"z2"},{"itemId":"i2","zoneId":"z2"}]}
                """);
        assertThat(wrong.get("status").asString()).isEqualTo("INCORRECT");
        String answerJson = participant.getPlayInteractionDetails().get(0).getAnswerJson();
        assertThat(new DragDropWrongAnswerLabeler().label(question, 0, "secret-salt", mapper.readTree(answerJson)))
                .contains("Cá → Vùng chim");

        start(GameType.DRAG_DROP, dragDrop());
        for (String placements : List.of("[{\"itemId\":\"nope\",\"zoneId\":\"z1\"}]", "[{\"itemId\":\"i1\",\"zoneId\":\"nope\"}]",
                "[{\"itemId\":\"i1\",\"zoneId\":\"z1\"},{\"itemId\":\"i1\",\"zoneId\":\"z2\"}]", "{}")) {
            assertThatThrownBy(() -> submit("{\"questionId\":\"q1\",\"timeSpentMs\":1000,\"placements\":" + placements + "}"))
                    .isInstanceOf(ApiException.class);
        }
    }

    @Test
    void skippingRecordsNoLabelableAnswer() {
        OrderingQuestion question = ordering();
        start(GameType.ORDERING, question);

        JsonNode result = submit("{\"questionId\":\"q1\",\"timeSpentMs\":1000,\"outcome\":\"SKIPPED\"}");

        assertThat(result.get("status").asString()).isEqualTo("SKIPPED");
        String answerJson = participant.getPlayInteractionDetails().get(0).getAnswerJson();
        assertThat(new OrderingWrongAnswerLabeler().label(question, 0, "secret-salt", mapper.readTree(answerJson))).isEmpty();
    }
}
