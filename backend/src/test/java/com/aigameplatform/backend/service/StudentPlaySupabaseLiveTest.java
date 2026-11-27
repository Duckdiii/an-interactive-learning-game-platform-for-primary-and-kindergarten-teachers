package com.aigameplatform.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.SelfSessionRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.time.LocalDateTime;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;
import javax.sql.DataSource;

/** Opt-in smoke against an explicitly approved Supabase database and the real SELF-play endpoints. */
@EnabledIfEnvironmentVariable(named = "RUN_FR08_SUPABASE_LIVE", matches = "true")
@SpringBootTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.curriculum-rag.enabled=false",
        "app.ai.gemini.game-generation.enabled=false",
        "debug=false",
        "logging.level.com.zaxxer.hikari=OFF",
        "logging.level.org.hibernate.orm.connections.pooling=OFF",
        "logging.level.org.springframework.boot.autoconfigure.logging.ConditionEvaluationReportLogger=OFF"
})
@AutoConfigureMockMvc
class StudentPlaySupabaseLiveTest {
    private static final String FIXTURE_PREFIX = "fr08-live-";
    private static final String PARTICIPANT_ID_HEADER = "X-Participant-Id";
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

    @Autowired private MockMvc mvc;
    @Autowired private JsonMapper mapper;
    @Autowired private GameRepository games;
    @Autowired private TeacherRepository teachers;
    @Autowired private SelfSessionRepository sessions;
    @Autowired private GameContentStrategyRegistry strategies;
    @Autowired private DataSource dataSource;
    @Autowired private JdbcTemplate jdbc;

    private Teacher teacher;
    private final List<String> gameIds = new ArrayList<>();
    private final List<String> sessionIds = new ArrayList<>();
    private final List<String> participantIds = new ArrayList<>();

    @BeforeEach
    void verifyApprovedSupabaseHostAndCreateSyntheticTeacher() throws Exception {
        try (var connection = dataSource.getConnection()) {
            String jdbcUrl = connection.getMetaData().getURL().toLowerCase(Locale.ROOT);
            String expectedHost = System.getenv("FR08_SUPABASE_EXPECTED_DB_HOST");
            String actualHost = URI.create(jdbcUrl.replaceFirst("^jdbc:", "")).getHost();
            assertThat(jdbcUrl.contains("supabase") && !jdbcUrl.contains(":6543"))
                    .as("FR-08 live test requires Supabase direct/session pooler; JDBC URL is redacted").isTrue();
            assertThat(expectedHost).as("set FR08_SUPABASE_EXPECTED_DB_HOST to the approved test database host")
                    .isNotBlank();
            assertThat(actualHost.equalsIgnoreCase(expectedHost))
                    .as("live test refuses an unexpected database host; host values are redacted").isTrue();
        }
        assertThat(jdbc.queryForObject("select count(*) from teachers where email like ?", Long.class,
                FIXTURE_PREFIX + "%"))
                .as("live test refuses to run while old synthetic FR-08 teachers remain").isZero();

        teacher = new Teacher();
        teacher.setEmail(FIXTURE_PREFIX + UUID.randomUUID() + "@example.invalid");
        teacher.setFullName("FR-08 synthetic self-play fixture");
        teacher.setPasswordHash("not-a-login-credential");
        teacher = teachers.saveAndFlush(teacher);
    }

    @AfterEach
    void deleteSyntheticRowsAndVerifyCleanup() {
        for (String sessionId : sessionIds) {
            sessions.deleteById(sessionId);
            sessions.flush();
            assertThat(sessions.findById(sessionId)).isEmpty();
            assertThat(jdbc.queryForObject("select count(*) from participants where game_session_id = ?", Long.class, sessionId))
                    .isZero();
        }
        for (String participantId : participantIds) {
            assertThat(jdbc.queryForObject("select count(*) from participants where id = ?", Long.class, participantId)).isZero();
            assertThat(jdbc.queryForObject("select count(*) from play_interaction_details where participant_id = ?",
                    Long.class, participantId)).isZero();
        }
        for (String gameId : gameIds) {
            games.deleteById(gameId);
            games.flush();
            assertThat(games.findById(gameId)).isEmpty();
        }
        if (teacher != null && teacher.getId() != null) {
            String teacherId = teacher.getId();
            teachers.deleteById(teacherId);
            teachers.flush();
            assertThat(teachers.findById(teacherId)).isEmpty();
        }
    }

    @Test
    @Timeout(180)
    void allTenGameTypesPersistAndReturnSelfPracticeResultsOnSupabase() throws Exception {
        String unknownShareCode = "F8" + UUID.randomUUID().toString().replace("-", "")
                .substring(0, 4).toUpperCase(Locale.ROOT);
        mvc.perform(get("/api/games/shared/{shareCode}", unknownShareCode))
                .andExpect(status().isNotFound());

        for (var entry : FIXTURES.entrySet()) {
            GameDsl dsl = loadFixture(entry.getValue());
            Game game = savePublishedGame(entry.getKey(), dsl);
            String sharedGameResponse = mvc.perform(get("/api/games/shared/{shareCode}", game.getShareCode()))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
            JsonNode sharedGame = mapper.readTree(sharedGameResponse).path("data");
            assertThat(sharedGame.path("gameType").asString()).isEqualTo(entry.getKey().name());
            assertThat(sharedGame.path("questionCount").asInt()).isEqualTo(dsl.questions().size());
            assertThat(sharedGame.has("questions")).isFalse();

            mvc.perform(post("/api/games/shared/{shareCode}/play", game.getShareCode())
                            .contentType(MediaType.APPLICATION_JSON).content("{\"nickname\":\" \"}"))
                    .andExpect(status().isBadRequest());
            String startResponse = mvc.perform(post("/api/games/shared/{shareCode}/play", game.getShareCode())
                            .contentType(MediaType.APPLICATION_JSON).content("{\"nickname\":\"Synthetic\"}"))
                    .andExpect(status().isCreated())
                    .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
            JsonNode started = mapper.readTree(startResponse).path("data");
            String sessionId = started.path("sessionId").asString();
            String participantId = started.path("participantId").asString();
            sessionIds.add(sessionId);
            participantIds.add(participantId);

            String questionsResponse = mvc.perform(get("/api/sessions/{sessionId}/questions", sessionId)
                            .header(PARTICIPANT_ID_HEADER, participantId))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
            JsonNode studentGame = mapper.readTree(questionsResponse).path("data");
            JsonNode studentQuestion = studentGame.path("questions").get(0);
            String orderingStepId = null;
            int orderingCorrectPosition = 0;
            assertThat(studentGame.path("gameType").asString()).isEqualTo(entry.getKey().name());
            assertNoAnswerKeys(studentQuestion, entry.getKey());

            if (entry.getKey() == GameType.ORDERING) {
                JsonNode displayedStep = studentQuestion.path("steps").get(0);
                JsonNode sourceStep = null;
                for (JsonNode candidate : mapper.valueToTree(dsl).path("questions").get(0).path("steps")) {
                    if (candidate.path("text").asString().equals(displayedStep.path("text").asString())) {
                        sourceStep = candidate;
                        break;
                    }
                }
                assertThat(sourceStep).isNotNull();
                orderingStepId = displayedStep.path("id").asString();
                orderingCorrectPosition = sourceStep.path("correctPosition").asInt();
                ObjectNode correctCheck = mapper.createObjectNode().put("questionId", "q1")
                        .put("stepId", orderingStepId).put("position", orderingCorrectPosition);
                String correctCheckResponse = mvc.perform(post("/api/sessions/{sessionId}/ordering-placement-check", sessionId)
                                .header(PARTICIPANT_ID_HEADER, participantId)
                                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsBytes(correctCheck)))
                        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
                assertThat(mapper.readTree(correctCheckResponse).path("data").path("isCorrect").asBoolean()).isTrue();

                ObjectNode wrongCheck = correctCheck.deepCopy();
                wrongCheck.put("position", orderingCorrectPosition == 1 ? 2 : 1);
                String wrongCheckResponse = mvc.perform(post("/api/sessions/{sessionId}/ordering-placement-check", sessionId)
                                .header(PARTICIPANT_ID_HEADER, participantId)
                                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsBytes(wrongCheck)))
                        .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
                assertThat(mapper.readTree(wrongCheckResponse).path("data").path("isCorrect").asBoolean()).isFalse();
                assertThat(jdbc.queryForObject("select count(*) from play_interaction_details where participant_id = ?",
                        Long.class, participantId)).isZero();
            }

            ObjectNode interaction = wrongButValidAnswer(entry.getKey(), dsl, studentQuestion);
            interaction.put("questionId", "q1");
            interaction.put("timeSpentMs", 0);
            String answerResponse = mvc.perform(post("/api/sessions/{sessionId}/interactions", sessionId)
                            .header(PARTICIPANT_ID_HEADER, participantId)
                            .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsBytes(interaction)))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
            JsonNode answer = mapper.readTree(answerResponse).path("data");
            assertThat(answer.path("status").asString()).isIn("CORRECT", "INCORRECT");
            if (orderingStepId != null) {
                ObjectNode afterCompletion = mapper.createObjectNode().put("questionId", "q1")
                        .put("stepId", orderingStepId).put("position", orderingCorrectPosition);
                mvc.perform(post("/api/sessions/{sessionId}/ordering-placement-check", sessionId)
                                .header(PARTICIPANT_ID_HEADER, participantId)
                                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsBytes(afterCompletion)))
                        .andExpect(status().isConflict());
            }

            String resultResponse = mvc.perform(get("/api/sessions/{sessionId}/my-result", sessionId)
                            .header(PARTICIPANT_ID_HEADER, participantId))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
            JsonNode summary = mapper.readTree(resultResponse).path("data");
            assertThat(summary.path("participantId").asString()).isEqualTo(participantId);
            assertThat(summary.path("answeredCount").asInt()).isEqualTo(1);
            assertThat(summary.path("totalQuestions").asInt()).isEqualTo(dsl.questions().size());
            assertThat(jdbc.queryForObject("select count(*) from play_interaction_details where participant_id = ?",
                    Long.class, participantId)).isEqualTo(1L);
            assertThat(jdbc.queryForObject("select status from play_interaction_details where participant_id = ?",
                    String.class, participantId)).isEqualTo(answer.path("status").asString());

            var persistedSession = sessions.findById(sessionId).orElseThrow();
            persistedSession.setSessionExpiresAt(LocalDateTime.now().minusMinutes(1));
            sessions.saveAndFlush(persistedSession);
            mvc.perform(get("/api/sessions/{sessionId}/questions", sessionId)
                            .header(PARTICIPANT_ID_HEADER, participantId))
                    .andExpect(status().isConflict());
            mvc.perform(get("/api/sessions/{sessionId}/my-result", sessionId)
                            .header(PARTICIPANT_ID_HEADER, participantId))
                    .andExpect(status().isOk());
            mvc.perform(get("/api/sessions/{sessionId}/my-result", sessionId)
                            .header(PARTICIPANT_ID_HEADER, "other-participant"))
                    .andExpect(status().isForbidden());
        }
    }

    private GameDsl loadFixture(String file) throws Exception {
        try (var input = getClass().getResourceAsStream("/dsl-examples/" + file)) {
            if (input == null) throw new IllegalStateException("Missing DSL fixture " + file);
            return mapper.readValue(input, GameDsl.class);
        }
    }

    private Game savePublishedGame(GameType type, GameDsl dsl) {
        Game game = new Game();
        game.setAuthor(teacher);
        game.setTitle("FR-08 synthetic " + type.name());
        game.setTopic("Synthetic self-practice smoke");
        game.setGameType(type);
        game.setGrade(dsl.metadata().gradeLevel());
        game.setSubject(dsl.metadata().subject());
        game.setSchemaVersion(dsl.schemaVersion());
        game.setQuestionNum(dsl.questions().size());
        game.setStatus(GameStatus.PUBLISHED);
        game.setShareCode("F8" + String.format(Locale.ROOT, "%02d", type.ordinal())
                + UUID.randomUUID().toString().replace("-", "").substring(0, 2).toUpperCase(Locale.ROOT));
        game.setQuestions(strategies.get(type).parseToQuestions(dsl));
        if (dsl instanceof VisualClozeGameDsl visualCloze) game.setVisualClozeMode(visualCloze.effectiveMode());
        if (dsl instanceof OddOneOutGameDsl oddOneOut) game.setOddOneOutMode(oddOneOut.effectiveMode());
        Game saved = games.saveAndFlush(game);
        gameIds.add(saved.getId());
        return saved;
    }

    private ObjectNode wrongButValidAnswer(GameType type, GameDsl dsl, JsonNode studentQuestion) {
        ObjectNode request = mapper.createObjectNode();
        JsonNode source = mapper.valueToTree(dsl).path("questions").get(0);
        switch (type) {
            case QUIZ -> {
                String expected = source.path("correctOptionId").asString();
                String wrong = null;
                for (JsonNode option : studentQuestion.path("options")) {
                    if (!option.path("id").asString().equals(expected)) { wrong = option.path("id").asString(); break; }
                }
                request.put("selectedOptionId", wrong);
            }
            case AUDIO_VISUAL_MATCH -> request.put("selectedOptionId", studentQuestion.path("options").get(0).path("id").asString());
            case ODD_ONE_OUT -> {
                String expected = source.path("oddOneOutId").asString();
                String wrong = null;
                for (JsonNode item : studentQuestion.path("items")) {
                    if (!item.path("id").asString().equals(expected)) { wrong = item.path("id").asString(); break; }
                }
                request.put("selectedItemId", wrong);
            }
            case SPOT_THE_TARGET -> {
                JsonNode region = source.path("hitRegion");
                request.put("x", region.path("x").doubleValue() < 0.5 ? 1 : 0);
                request.put("y", region.path("y").doubleValue() < 0.5 ? 1 : 0);
            }
            case WORD_SCRAMBLE -> request.put("word", "fr08-synthetic-wrong-answer");
            case MATCHING -> request.set("matches", mapper.createArrayNode());
            case MEMORY_CARD -> {
                request.set("matchedPairIds", mapper.createArrayNode());
                request.put("flips", 2);
            }
            case DRAG_DROP -> request.set("placements", mapper.createArrayNode());
            case ORDERING -> request.set("order", mapper.createArrayNode());
            case VISUAL_CLOZE -> request.put("answer", "fr08-synthetic-wrong-answer");
        }
        return request;
    }

    private void assertNoAnswerKeys(JsonNode node, GameType type) {
        for (String field : List.of("correctOptionId", "oddOneOutId", "correct", "distractors", "hitRegion",
                "correctWord", "targetZoneId", "correctPosition", "correctAnswer")) {
            assertThat(node.has(field)).as("answer field %s leaked for %s", field, type).isFalse();
        }
        if (type == GameType.MATCHING) assertThat(node.has("pairs")).isFalse();
    }
}
