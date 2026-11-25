package com.aigameplatform.backend.service.play;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.OddOneOutMode;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.session.Participant;
import com.aigameplatform.backend.entity.session.SelfSession;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.SelfSessionRepository;
import com.aigameplatform.backend.service.strategy.AudioVisualMatchGameStrategy;
import com.aigameplatform.backend.service.strategy.DragDropGameStrategy;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.strategy.MatchingGameStrategy;
import com.aigameplatform.backend.service.strategy.MemoryCardGameStrategy;
import com.aigameplatform.backend.service.strategy.OddOneOutGameStrategy;
import com.aigameplatform.backend.service.strategy.OrderingGameStrategy;
import com.aigameplatform.backend.service.strategy.QuizGameStrategy;
import com.aigameplatform.backend.service.strategy.SpotTheTargetGameStrategy;
import com.aigameplatform.backend.service.strategy.VisualClozeGameStrategy;
import com.aigameplatform.backend.service.strategy.WordScrambleGameStrategy;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;
import tools.jackson.databind.json.JsonMapper;

class StudentPlayAllTypesTest {
    private static final String SESSION_ID = "session-1";
    private static final String PARTICIPANT_ID = "participant-1";
    private static final String SESSION_SALT = "fr08-test-session-salt";
    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final Map<GameType, String> FIXTURES = Map.of(
            GameType.QUIZ, "quiz.json",
            GameType.AUDIO_VISUAL_MATCH, "audio-visual-match.json",
            GameType.ODD_ONE_OUT, "odd-one-out.json",
            GameType.SPOT_THE_TARGET, "spot-the-target.json",
            GameType.WORD_SCRAMBLE, "word-scramble.json",
            GameType.MATCHING, "matching.json",
            GameType.MEMORY_CARD, "memory-card.json",
            GameType.DRAG_DROP, "drag-drop.json",
            GameType.ORDERING, "ordering.json",
            GameType.VISUAL_CLOZE, "visual-cloze.json");
    private static final Set<String> ANSWER_KEYS = Set.of("correctOptionId", "oddOneOutId", "correct",
            "distractors", "hitRegion", "correctWord", "targetZoneId", "correctPosition", "correctAnswer");

    @Test
    void studentProjectionRedactsAnswersForEveryGameType() throws Exception {
        GameContentStrategyRegistry strategies = strategies();
        for (var fixture : FIXTURES.entrySet()) {
            Fixture gameFixture = fixture(fixture.getKey(), fixture.getValue(), strategies);
            GameRepository games = mock(GameRepository.class);
            SelfSessionRepository sessions = mock(SelfSessionRepository.class);
            when(sessions.findById(SESSION_ID)).thenReturn(Optional.of(gameFixture.session()));
            StudentPlayService service = new StudentPlayService(games, sessions, strategies, MAPPER);

            JsonNode response = service.questions(SESSION_ID, PARTICIPANT_ID);

            assertThat(response.path("gameType").asString()).as(fixture.getKey().name()).isEqualTo(fixture.getKey().name());
            assertThat(response.path("questions").size()).as(fixture.getKey().name()).isPositive();
            assertNoAnswerKeys(response, fixture.getKey());
        }
    }

    @Test
    void correctAndIncorrectAnswersAreGradedAndTerminalResubmissionIsIdempotentForEveryGameType() throws Exception {
        GameContentStrategyRegistry strategies = strategies();
        for (var item : FIXTURES.entrySet()) {
            Fixture correctFixture = fixture(item.getKey(), item.getValue(), strategies);
            StudentPlayService correctService = service(correctFixture, strategies);
            JsonNode studentGame = correctService.questions(SESSION_ID, PARTICIPANT_ID);
            JsonNode sourceQuestion = MAPPER.valueToTree(correctFixture.dsl()).path("questions").get(0);
            JsonNode studentQuestion = studentGame.path("questions").get(0);
            Map<String, Object> correctPayload = answerFor(item.getKey(), sourceQuestion, studentQuestion, true);
            ObjectNode correctBody = interaction("q1", correctPayload);

            Map<String, Object> accepted = correctService.interact(SESSION_ID, PARTICIPANT_ID, correctBody);
            Map<String, Object> repeated = correctService.interact(SESSION_ID, PARTICIPANT_ID,
                    interaction("q1", answerFor(item.getKey(), sourceQuestion, studentQuestion, false)));

            assertThat(accepted.get("status")).as(item.getKey().name()).isEqualTo("CORRECT");
            assertThat(accepted.get("pointsEarned")).as(item.getKey().name())
                    .isEqualTo(studentQuestion.path("points").intValue());
            assertThat(repeated).as(item.getKey().name()).isEqualTo(accepted);
            assertThat(correctFixture.session().getParticipants().get(0).getScore()).as(item.getKey().name())
                    .isEqualTo(studentQuestion.path("points").intValue());
            assertThat(correctFixture.session().getParticipants().get(0).getPlayInteractionDetails())
                    .as(item.getKey().name()).hasSize(1);

            Fixture incorrectFixture = fixture(item.getKey(), item.getValue(), strategies);
            StudentPlayService incorrectService = service(incorrectFixture, strategies);
            JsonNode incorrectGame = incorrectService.questions(SESSION_ID, PARTICIPANT_ID);
            JsonNode incorrectQuestion = incorrectGame.path("questions").get(0);
            Map<String, Object> wrongPayload = answerFor(item.getKey(), sourceQuestion, incorrectQuestion, false);
            Map<String, Object> rejected = incorrectService.interact(SESSION_ID, PARTICIPANT_ID,
                    interaction("q1", wrongPayload));

            assertThat(rejected.get("status")).as(item.getKey().name()).isEqualTo("INCORRECT");
            assertThat(rejected.get("pointsEarned")).as(item.getKey().name()).isEqualTo(0);
            assertThat(rejected.get("correctAnswer")).as(item.getKey().name()).isNotNull();
        }
    }

    @Test
    void myResultReturnsPersistedCountsForOwnerEvenAfterExpiryAndRejectsOtherParticipants() throws Exception {
        GameContentStrategyRegistry strategies = strategies();
        Fixture fixture = fixture(GameType.QUIZ, FIXTURES.get(GameType.QUIZ), strategies);
        StudentPlayService service = service(fixture, strategies);
        JsonNode studentGame = service.questions(SESSION_ID, PARTICIPANT_ID);
        JsonNode sourceQuestion = MAPPER.valueToTree(fixture.dsl()).path("questions").get(0);
        JsonNode studentQuestion = studentGame.path("questions").get(0);
        Map<String, Object> accepted = service.interact(SESSION_ID, PARTICIPANT_ID,
                interaction("q1", answerFor(GameType.QUIZ, sourceQuestion, studentQuestion, true)));
        fixture.session().setSessionExpiresAt(LocalDateTime.now().minusMinutes(1));

        Map<String, Object> summary = service.myResult(SESSION_ID, PARTICIPANT_ID);

        assertThat(summary).containsEntry("status", "ENDED").containsEntry("score", accepted.get("totalScore"))
                .containsEntry("correctCount", 1).containsEntry("incorrectCount", 0)
                .containsEntry("totalQuestions", fixture.session().getGame().getQuestions().size())
                .containsEntry("answeredCount", 1).containsEntry("participantId", PARTICIPANT_ID);
        assertThatThrownBy(() -> service.myResult(SESSION_ID, "other-participant"))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void orderingPlacementChecksPreserveImmediateFeedbackWithoutScoringOrSavingAnswers() throws Exception {
        GameContentStrategyRegistry strategies = strategies();
        Fixture fixture = fixture(GameType.ORDERING, FIXTURES.get(GameType.ORDERING), strategies);
        StudentPlayService service = service(fixture, strategies);
        JsonNode sourceQuestion = MAPPER.valueToTree(fixture.dsl()).path("questions").get(0);
        JsonNode studentQuestion = service.questions(SESSION_ID, PARTICIPANT_ID).path("questions").get(0);
        JsonNode displayedStep = studentQuestion.path("steps").get(0);
        JsonNode sourceStep = null;
        for (JsonNode candidate : sourceQuestion.path("steps")) {
            if (sameContent(candidate, displayedStep)) sourceStep = candidate;
        }
        assertThat(sourceStep).isNotNull();
        int correctPosition = sourceStep.path("correctPosition").asInt();
        int incorrectPosition = correctPosition == 1 ? 2 : 1;

        assertThat(service.checkOrderingPlacement(SESSION_ID, PARTICIPANT_ID,
                placementRequest("q1", displayedStep.path("id").asString(), correctPosition)))
                .containsEntry("isCorrect", true);
        assertThat(service.checkOrderingPlacement(SESSION_ID, PARTICIPANT_ID,
                placementRequest("q1", displayedStep.path("id").asString(), incorrectPosition)))
                .containsEntry("isCorrect", false);
        assertThat(fixture.session().getParticipants().get(0).getScore()).isZero();
        assertThat(fixture.session().getParticipants().get(0).getPlayInteractionDetails()).isEmpty();

        assertThatThrownBy(() -> service.checkOrderingPlacement(SESSION_ID, "other-participant",
                placementRequest("q1", displayedStep.path("id").asString(), correctPosition)))
                .isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.checkOrderingPlacement(SESSION_ID, PARTICIPANT_ID,
                placementRequest("q1", "unknown", 1))).isInstanceOf(ApiException.class);
        assertThatThrownBy(() -> service.checkOrderingPlacement(SESSION_ID, PARTICIPANT_ID,
                placementRequest("q1", displayedStep.path("id").asString(), 0))).isInstanceOf(ApiException.class);

        service.interact(SESSION_ID, PARTICIPANT_ID, interaction("q1", Map.of("order", List.of())));
        assertThatThrownBy(() -> service.checkOrderingPlacement(SESSION_ID, PARTICIPANT_ID,
                placementRequest("q1", displayedStep.path("id").asString(), correctPosition)))
                .isInstanceOf(ApiException.class);

        Fixture expired = fixture(GameType.ORDERING, FIXTURES.get(GameType.ORDERING), strategies);
        StudentPlayService expiredService = service(expired, strategies);
        expired.session().setSessionExpiresAt(LocalDateTime.now().minusMinutes(1));
        assertThatThrownBy(() -> expiredService.checkOrderingPlacement(SESSION_ID, PARTICIPANT_ID,
                placementRequest("q1", "s1", 1))).isInstanceOf(ApiException.class);
    }

    private static ObjectNode placementRequest(String questionId, String stepId, int position) {
        return MAPPER.createObjectNode().put("questionId", questionId).put("stepId", stepId).put("position", position);
    }

    private static StudentPlayService service(Fixture fixture, GameContentStrategyRegistry strategies) {
        GameRepository games = mock(GameRepository.class);
        SelfSessionRepository sessions = mock(SelfSessionRepository.class);
        when(sessions.findById(SESSION_ID)).thenReturn(Optional.of(fixture.session()));
        when(sessions.findByIdForUpdate(SESSION_ID)).thenReturn(Optional.of(fixture.session()));
        when(sessions.save(org.mockito.ArgumentMatchers.any())).thenAnswer(invocation -> invocation.getArgument(0));
        return new StudentPlayService(games, sessions, strategies, MAPPER);
    }

    private static ObjectNode interaction(String questionId, Map<String, Object> answer) {
        ObjectNode request = MAPPER.createObjectNode();
        request.put("questionId", questionId);
        request.put("timeSpentMs", 0);
        ObjectNode fields = MAPPER.valueToTree(answer);
        request.setAll(fields);
        return request;
    }

    private static Map<String, Object> answerFor(GameType type, JsonNode source, JsonNode student, boolean correct) {
        return switch (type) {
            case QUIZ -> Map.of("selectedOptionId", chooseDifferentOrCorrect(
                    student.path("options"), source.path("correctOptionId").asString(), correct));
            case AUDIO_VISUAL_MATCH -> Map.of("selectedOptionId", chooseDifferentOrCorrect(
                    student.path("options"), source.path("correct").path("visualPrompt").asString(), correct, "visualPrompt"));
            case ODD_ONE_OUT -> Map.of("selectedItemId", chooseDifferentOrCorrect(
                    student.path("items"), source.path("oddOneOutId").asString(), correct));
            case SPOT_THE_TARGET -> {
                JsonNode region = source.path("hitRegion");
                yield correct ? Map.of("x", region.path("x").doubleValue(), "y", region.path("y").doubleValue())
                        : Map.of("x", 1d, "y", 1d);
            }
            case WORD_SCRAMBLE -> Map.of("word", correct ? source.path("correctWord").asString() : "not-the-answer");
            case MATCHING -> Map.of("matches", matchingAnswer(source, student, correct));
            case MEMORY_CARD -> Map.of("matchedPairIds", correct ? stringValues(source.path("pairs"), "pairId") : List.of(),
                    "flips", 4);
            case DRAG_DROP -> Map.of("placements", dragAnswer(source, student, correct));
            case ORDERING -> Map.of("order", orderingAnswer(source, student, correct));
            case VISUAL_CLOZE -> Map.of("answer", correct ? source.path("correctAnswer").asString() : "not-the-answer");
        };
    }

    private static String chooseDifferentOrCorrect(JsonNode options, String expected, boolean correct) {
        for (JsonNode option : options) {
            String id = option.path("id").asString();
            if (correct ? id.equals(expected) : !id.equals(expected)) return id;
        }
        throw new IllegalStateException("No option for grading fixture");
    }

    private static String chooseDifferentOrCorrect(JsonNode options, String expectedValue, boolean correct, String field) {
        for (JsonNode option : options) {
            String value = option.path(field).asString();
            if (correct ? value.equals(expectedValue) : !value.equals(expectedValue)) return option.path("id").asString();
        }
        throw new IllegalStateException("No option for grading fixture");
    }

    private static List<Map<String, String>> matchingAnswer(JsonNode source, JsonNode student, boolean correct) {
        List<Map<String, String>> result = new java.util.ArrayList<>();
        JsonNode pairs = source.path("pairs");
        JsonNode leftItems = student.path("leftItems");
        JsonNode rightItems = student.path("rightItems");
        for (int i = 0; i < pairs.size(); i++) {
            String leftId = leftItems.get(i).path("id").asString();
            JsonNode wanted = pairs.get(i).path("right");
            String rightId = "";
            for (JsonNode candidate : rightItems) {
                if (sameContent(wanted, candidate)) rightId = candidate.path("id").asString();
            }
            result.add(Map.of("leftPairId", leftId, "rightPairId", rightId));
        }
        if (!correct && result.size() > 1) {
            Map<String, String> first = result.get(0);
            Map<String, String> second = result.get(1);
            result.set(0, Map.of("leftPairId", first.get("leftPairId"), "rightPairId", second.get("rightPairId")));
            result.set(1, Map.of("leftPairId", second.get("leftPairId"), "rightPairId", first.get("rightPairId")));
        }
        return result;
    }

    private static List<Map<String, String>> dragAnswer(JsonNode source, JsonNode student, boolean correct) {
        List<Map<String, String>> result = new java.util.ArrayList<>();
        for (JsonNode sourceItem : source.path("items")) {
            JsonNode displayItem = null;
            for (JsonNode candidate : student.path("items")) {
                if (sameContent(sourceItem, candidate)) displayItem = candidate;
            }
            String zoneId = "";
            for (JsonNode sourceZone : source.path("dropZones")) {
                if (sourceZone.path("id").asString().equals(sourceItem.path("targetZoneId").asString())) {
                    for (JsonNode displayZone : student.path("dropZones")) {
                        if (displayZone.path("label").asString().equals(sourceZone.path("label").asString()))
                            zoneId = displayZone.path("id").asString();
                    }
                }
            }
            result.add(Map.of("itemId", displayItem.path("id").asString(), "zoneId", zoneId));
        }
        if (!correct) {
            String firstZone = student.path("dropZones").get(0).path("id").asString();
            String secondZone = student.path("dropZones").get(1).path("id").asString();
            Map<String, String> first = result.get(0);
            result.set(0, Map.of("itemId", first.get("itemId"),
                    "zoneId", first.get("zoneId").equals(firstZone) ? secondZone : firstZone));
        }
        return result;
    }

    private static List<String> orderingAnswer(JsonNode source, JsonNode student, boolean correct) {
        List<JsonNode> orderedSource = new java.util.ArrayList<>();
        source.path("steps").forEach(orderedSource::add);
        orderedSource.sort(java.util.Comparator.comparingInt(step -> step.path("correctPosition").asInt()));
        List<String> result = new java.util.ArrayList<>();
        for (JsonNode sourceStep : orderedSource) {
            for (JsonNode displayStep : student.path("steps")) {
                if (sameContent(sourceStep, displayStep)) result.add(displayStep.path("id").asString());
            }
        }
        if (!correct) Collections.reverse(result);
        return result;
    }

    private static List<String> stringValues(JsonNode array, String field) {
        List<String> result = new java.util.ArrayList<>();
        array.forEach(value -> result.add(value.path(field).asString()));
        return result;
    }

    private static boolean sameContent(JsonNode left, JsonNode right) {
        for (String field : List.of("text", "visualPrompt", "imageUrl")) {
            if (!left.path(field).asText("").equals(right.path(field).asText(""))) return false;
        }
        return true;
    }

    private static void assertNoAnswerKeys(JsonNode node, GameType gameType) {
        if (node.isObject()) {
            node.properties().forEach(property -> {
                String key = property.getKey();
                boolean matchingPairsAreTheOnlyPairException = gameType == GameType.MEMORY_CARD && key.equals("pairs");
                assertThat(ANSWER_KEYS.contains(key) && !matchingPairsAreTheOnlyPairException)
                        .as("answer field %s for %s", key, gameType).isFalse();
                if (gameType == GameType.MATCHING) {
                    assertThat(key).as("MATCHING original pair relationship").isNotEqualTo("pairs");
                }
                assertNoAnswerKeys(property.getValue(), gameType);
            });
        } else if (node.isArray()) {
            node.forEach(value -> assertNoAnswerKeys(value, gameType));
        }
    }

    private static Fixture fixture(GameType type, String file, GameContentStrategyRegistry strategies) throws Exception {
        GameDsl dsl;
        try (InputStream input = StudentPlayAllTypesTest.class.getResourceAsStream("/dsl-examples/" + file)) {
            if (input == null) throw new IllegalStateException("Missing DSL fixture " + file);
            dsl = MAPPER.readValue(input, GameDsl.class);
        }
        Game game = new Game();
        game.setId("game-" + type.name());
        game.setTitle(dsl.metadata().title());
        game.setTopic(dsl.metadata().topic());
        game.setGameType(type);
        game.setSchemaVersion(dsl.schemaVersion());
        game.setSubject(Subject.MATH);
        game.setGrade(GradeLevel.GRADE_1);
        game.setStatus(GameStatus.PUBLISHED);
        game.setQuestionNum(dsl.questions().size());
        if (dsl instanceof com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl visualCloze) {
            game.setVisualClozeMode(visualCloze.effectiveMode());
        }
        if (dsl instanceof com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl oddOneOut) {
            game.setOddOneOutMode(oddOneOut.effectiveMode() == null ? OddOneOutMode.TEXT : oddOneOut.effectiveMode());
        }
        List<QuestionGame> questions = strategies.get(type).parseToQuestions(dsl);
        for (int i = 0; i < questions.size(); i++) questions.get(i).setId("question-" + type + "-" + i);
        game.setQuestions(questions);

        Participant participant = new Participant();
        participant.setId(PARTICIPANT_ID);
        participant.setStudentNickname("Bé An");
        SelfSession session = new SelfSession();
        session.setId(SESSION_ID);
        session.setGame(game);
        session.setStudentOptionSalt(SESSION_SALT);
        session.setStatus(com.aigameplatform.backend.entity.enums.SessionStatus.ACTIVE);
        session.setSessionExpiresAt(LocalDateTime.now().plusHours(1));
        session.setParticipants(List.of(participant));
        return new Fixture(session, dsl);
    }

    private static GameContentStrategyRegistry strategies() {
        return new GameContentStrategyRegistry(List.of(
                new QuizGameStrategy(MAPPER),
                new AudioVisualMatchGameStrategy(MAPPER),
                new OddOneOutGameStrategy(MAPPER),
                new SpotTheTargetGameStrategy(MAPPER),
                new WordScrambleGameStrategy(MAPPER),
                new MatchingGameStrategy(MAPPER),
                new MemoryCardGameStrategy(MAPPER),
                new DragDropGameStrategy(MAPPER),
                new OrderingGameStrategy(MAPPER),
                new VisualClozeGameStrategy(MAPPER)));
    }

    private record Fixture(SelfSession session, GameDsl dsl) {}
}
