package com.aigameplatform.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.QuizGameDsl;
import com.aigameplatform.backend.dto.dsl.QuizQuestionDsl;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.SelfSessionRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.security.JwtService;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.validation.safety.ContentModerationClient;
import com.aigameplatform.backend.service.validation.safety.ModerationResult;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Opt-in real-Supabase publish smoke. All rows and content are synthetic; moderation is stubbed. */
@EnabledIfEnvironmentVariable(named = "RUN_FR07_SUPABASE_LIVE", matches = "true")
@SpringBootTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.curriculum-rag.enabled=false",
        "app.moderation.required=false",
        "app.ai.gemini.game-generation.enabled=false"
})
@AutoConfigureMockMvc
class GamePublicationSupabaseLiveTest {
    private static final String FIXTURE_EMAIL_PREFIX = "fr07-live-";

    @Autowired private MockMvc mvc;
    @Autowired private JsonMapper mapper;
    @Autowired private GameRepository games;
    @Autowired private TeacherRepository teachers;
    @Autowired private SelfSessionRepository selfSessions;
    @Autowired private GameContentStrategyRegistry strategies;
    @Autowired private JwtService jwtService;
    @Autowired private DataSource dataSource;
    @Autowired private JdbcTemplate jdbc;
    @MockitoBean private ContentModerationClient moderation;

    private Teacher teacher;
    private Game draft;
    private String accessToken;
    private String selfSessionId;
    private String partialInteractionId;

    @BeforeEach
    void seedSyntheticDraft() throws Exception {
        when(moderation.isConfigured()).thenReturn(true);
        when(moderation.moderate(anyList())).thenAnswer(invocation -> {
            List<String> texts = invocation.getArgument(0);
            return texts.stream().map(ignored -> new ModerationResult(false, List.of())).toList();
        });

        try (var connection = dataSource.getConnection()) {
            String jdbcUrl = connection.getMetaData().getURL().toLowerCase(Locale.ROOT);
            String expectedHost = System.getenv("FR07_SUPABASE_EXPECTED_DB_HOST");
            String actualHost = java.net.URI.create(jdbcUrl.replaceFirst("^jdbc:", "")).getHost();
            assertThat(jdbcUrl.contains("supabase") && !jdbcUrl.contains(":6543"))
                    .as("live test requires Supabase direct/session pooler; JDBC URL is redacted")
                    .isTrue();
            assertThat(expectedHost).as("set FR07_SUPABASE_EXPECTED_DB_HOST to the explicitly approved test database host")
                    .isNotBlank();
            assertThat(actualHost.equalsIgnoreCase(expectedHost))
                    .as("live test refuses an unexpected database host; host values are redacted")
                    .isTrue();
        }

        String email = FIXTURE_EMAIL_PREFIX + UUID.randomUUID() + "@example.invalid";
        teacher = new Teacher();
        teacher.setEmail(email);
        teacher.setFullName("FR-07 synthetic publish fixture");
        teacher.setPasswordHash("not-a-login-credential");
        teacher = teachers.saveAndFlush(teacher);

        QuizGameDsl fixture = loadQuizFixture();
        QuizGameDsl syntheticDsl = new QuizGameDsl(fixture.schemaVersion(), fixture.gameType(),
                new GameMetadata("FR-07 synthetic publish", Subject.MATH, GradeLevel.GRADE_2,
                        "Synthetic publishing smoke"),
                fixture.gameplaySettings(), fixture.questions());
        draft = new Game();
        draft.setAuthor(teacher);
        draft.setTitle(syntheticDsl.metadata().title());
        draft.setTopic(syntheticDsl.metadata().topic());
        draft.setGameType(GameType.QUIZ);
        draft.setSubject(syntheticDsl.metadata().subject());
        draft.setGrade(syntheticDsl.metadata().gradeLevel());
        draft.setSchemaVersion(syntheticDsl.schemaVersion());
        draft.setQuestionNum(syntheticDsl.questions().size());
        draft.setStatus(GameStatus.DRAFT);
        draft.setQuestions(strategies.get(GameType.QUIZ).parseToQuestions(syntheticDsl));
        draft = games.saveAndFlush(draft);

        accessToken = jwtService.generateAccessToken(teacher.getId(), email, "fr07-live-" + UUID.randomUUID());
    }

    @AfterEach
    void removeSyntheticRows() {
        try {
            if (selfSessionId != null) {
                selfSessions.deleteById(selfSessionId);
                selfSessions.flush();
                assertThat(selfSessions.findById(selfSessionId)).isEmpty();
            }
            if (partialInteractionId != null) {
                assertThat(jdbc.queryForObject("select count(*) from play_interaction_details where id = ?",
                        Long.class, partialInteractionId)).isZero();
            }
        } finally {
            try {
                if (draft != null && draft.getId() != null) {
                    games.deleteById(draft.getId());
                    games.flush();
                }
            } finally {
                if (teacher != null && teacher.getId() != null) {
                    String teacherId = teacher.getId();
                    teachers.deleteById(teacherId);
                    teachers.flush();
                    assertThat(games.findByIdAndAuthor_Id(draft == null ? "" : draft.getId(), teacherId)).isEmpty();
                    assertThat(teachers.findById(teacherId)).isEmpty();
                }
            }
        }
    }

    @Test
    @Timeout(180)
    void authenticatedPublishPersistsAndPublishesShareableGameOnSupabase() throws Exception {
        QuizGameDsl latestDsl = new QuizGameDsl("1.0.0", GameType.QUIZ,
                new GameMetadata("FR-07 published synthetic game", Subject.MATH, GradeLevel.GRADE_2,
                        "Synthetic publishing smoke"),
                loadQuizFixture().gameplaySettings(), loadQuizFixture().questions());
        ObjectNode publishBody = mapper.valueToTree(latestDsl);

        ObjectNode invalidBody = publishBody.deepCopy();
        ((ObjectNode) invalidBody.get("metadata")).put("title", " ");
        mvc.perform(post("/api/games/{gameId}/publish", draft.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsBytes(invalidBody)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
        assertThat(games.findByIdAndAuthor_Id(draft.getId(), teacher.getId()).orElseThrow().getStatus())
                .isEqualTo(GameStatus.DRAFT);

        String otherTeacherToken = jwtService.generateAccessToken(
                "fr07-not-owner-" + UUID.randomUUID(), "not-owner@example.invalid", "fr07-other-session");
        mvc.perform(post("/api/games/{gameId}/publish", draft.getId())
                        .header("Authorization", "Bearer " + otherTeacherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsBytes(publishBody)))
                .andExpect(status().isNotFound());
        assertThat(games.findByIdAndAuthor_Id(draft.getId(), teacher.getId()).orElseThrow().getStatus())
                .isEqualTo(GameStatus.DRAFT);

        String firstResponse = mvc.perform(post("/api/games/{gameId}/publish", draft.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsBytes(publishBody)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        var firstData = mapper.readTree(firstResponse).path("data");
        String shareCode = firstData.path("shareCode").asString();
        String shareUrl = firstData.path("shareUrl").asString();
        assertThat(shareCode).hasSize(6);
        assertThat(shareUrl).endsWith("/" + shareCode);

        Game published = games.findByIdAndAuthor_Id(draft.getId(), teacher.getId()).orElseThrow();
        assertThat(published.getStatus()).isEqualTo(GameStatus.PUBLISHED);
        assertThat(published.getShareCode()).isEqualTo(shareCode);
        assertThat(published.getTitle()).isEqualTo("FR-07 published synthetic game");
        assertThat(published.getQuestionNum()).isEqualTo(2);

        var metadataAutosave = new QuizGameDsl(latestDsl.schemaVersion(), latestDsl.gameType(),
                new GameMetadata("FR-07 metadata autosave", Subject.MATH, GradeLevel.GRADE_2,
                        "Synthetic publishing smoke"), latestDsl.gameplaySettings(), latestDsl.questions());
        mvc.perform(put("/api/games/{gameId}", draft.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsBytes(metadataAutosave)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PUBLISHED"));
        Game metadataSaved = games.findByIdAndAuthor_Id(draft.getId(), teacher.getId()).orElseThrow();
        assertThat(metadataSaved.getTitle()).isEqualTo("FR-07 metadata autosave");
        assertThat(metadataSaved.getShareCode()).isEqualTo(shareCode);

        QuizQuestionDsl firstQuestion = (QuizQuestionDsl) latestDsl.questions().get(0);
        var updatedQuestion = new QuizQuestionDsl(firstQuestion.id(), firstQuestion.timeLimitSeconds(),
                firstQuestion.points(), firstQuestion.audioText(), firstQuestion.audioUrl(), firstQuestion.visualPrompt(),
                firstQuestion.imageUrl(), "Updated synthetic question", firstQuestion.options(), firstQuestion.correctOptionId());
        QuizQuestionDsl secondQuestion = (QuizQuestionDsl) latestDsl.questions().get(1);
        var updatedDsl = new QuizGameDsl(latestDsl.schemaVersion(), latestDsl.gameType(),
                new GameMetadata("FR-07 republished synthetic game", Subject.MATH, GradeLevel.GRADE_2,
                        "Synthetic publishing smoke"), latestDsl.gameplaySettings(),
                List.of(updatedQuestion, secondQuestion));
        String changedResponse = mvc.perform(post("/api/games/{gameId}/publish", draft.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsBytes(updatedDsl)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(mapper.readTree(changedResponse).path("data").path("shareCode").asString())
                .isEqualTo(shareCode);
        assertThat(games.findByIdAndAuthor_Id(draft.getId(), teacher.getId()).orElseThrow().getTitle())
                .isEqualTo("FR-07 republished synthetic game");
        mvc.perform(get("/api/games/{gameId}", draft.getId())
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.questions[0].questionText").value("Updated synthetic question"));

        String secondResponse = mvc.perform(post("/api/games/{gameId}/publish", draft.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsBytes(updatedDsl)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(mapper.readTree(secondResponse).path("data").path("shareCode").asString()).isEqualTo(shareCode);

        String sessionResponse = mvc.perform(post("/api/games/shared/{shareCode}/play", shareCode)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nickname\":\"Synthetic\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        selfSessionId = mapper.readTree(sessionResponse).path("data").path("sessionId").asString();

        var changedGrade = new QuizGameDsl(updatedDsl.schemaVersion(), updatedDsl.gameType(),
                new GameMetadata(updatedDsl.metadata().title(), Subject.MATH, GradeLevel.GRADE_3,
                        updatedDsl.metadata().topic()), updatedDsl.gameplaySettings(), updatedDsl.questions());
        mvc.perform(put("/api/games/{gameId}", draft.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsBytes(changedGrade)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("GAME_HAS_PLAY_HISTORY"));
        mvc.perform(post("/api/games/{gameId}/publish", draft.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsBytes(changedGrade)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("GAME_HAS_PLAY_HISTORY"));
        assertThat(games.findByIdAndAuthor_Id(draft.getId(), teacher.getId()).orElseThrow().getGrade())
                .isEqualTo(GradeLevel.GRADE_2);

        var selfSession = selfSessions.findById(selfSessionId).orElseThrow();
        selfSession.setSessionExpiresAt(LocalDateTime.now().minusMinutes(1));
        selfSessions.saveAndFlush(selfSession);
        QuizQuestionDsl afterExpiryQuestion = new QuizQuestionDsl(updatedQuestion.id(), updatedQuestion.timeLimitSeconds(),
                updatedQuestion.points(), updatedQuestion.audioText(), updatedQuestion.audioUrl(), updatedQuestion.visualPrompt(),
                updatedQuestion.imageUrl(), "Updated after expired no-result session", updatedQuestion.options(),
                updatedQuestion.correctOptionId());
        var afterExpiryDsl = new QuizGameDsl(updatedDsl.schemaVersion(), updatedDsl.gameType(), updatedDsl.metadata(),
                updatedDsl.gameplaySettings(), List.of(afterExpiryQuestion, secondQuestion));
        mvc.perform(post("/api/games/{gameId}/publish", draft.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsBytes(afterExpiryDsl)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.shareCode").value(shareCode));
        mvc.perform(get("/api/games/{gameId}", draft.getId()).header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.questions[0].questionText").value("Updated after expired no-result session"));

        mvc.perform(get("/api/games/shared/{shareCode}", shareCode))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.gameTitle").value("FR-07 republished synthetic game"))
                .andExpect(jsonPath("$.data.gameType").value("QUIZ"))
                .andExpect(jsonPath("$.data.questionCount").value(2));
    }

    @Test
    @Timeout(180)
    void concurrentPublishesForOneDraftReturnOneStableShareCode() throws Exception {
        QuizGameDsl fixture = loadQuizFixture();
        QuizGameDsl body = new QuizGameDsl(fixture.schemaVersion(), fixture.gameType(),
                new GameMetadata("FR-07 concurrent synthetic game", Subject.MATH, GradeLevel.GRADE_2,
                        "Synthetic concurrency smoke"), fixture.gameplaySettings(), fixture.questions());
        byte[] requestBody = mapper.writeValueAsBytes(body);
        var gate = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var first = executor.submit(() -> {
                gate.await();
                return mvc.perform(post("/api/games/{gameId}/publish", draft.getId())
                                .header("Authorization", "Bearer " + accessToken)
                                .contentType(MediaType.APPLICATION_JSON).content(requestBody))
                        .andReturn().getResponse();
            });
            var second = executor.submit(() -> {
                gate.await();
                return mvc.perform(post("/api/games/{gameId}/publish", draft.getId())
                                .header("Authorization", "Bearer " + accessToken)
                                .contentType(MediaType.APPLICATION_JSON).content(requestBody))
                        .andReturn().getResponse();
            });
            gate.countDown();
            var firstResponse = first.get();
            var secondResponse = second.get();
            assertThat(firstResponse.getStatus()).isEqualTo(200);
            assertThat(secondResponse.getStatus()).isEqualTo(200);
            String firstCode = mapper.readTree(firstResponse.getContentAsString()).path("data").path("shareCode").asString();
            String secondCode = mapper.readTree(secondResponse.getContentAsString()).path("data").path("shareCode").asString();
            assertThat(firstCode).hasSize(6);
            assertThat(secondCode).isEqualTo(firstCode);
        }
    }

    @Test
    @Timeout(180)
    void persistedPartialInteractionStillBlocksRepublishAfterSelfSessionExpires() throws Exception {
        // Start from the canonical DSL the editor receives from GET, including server-derived defaults.
        ObjectNode body = loadCurrentGameDsl(draft.getId());
        ((ObjectNode) body.path("metadata")).put("title", "FR-07 interaction history synthetic");
        String publishResponse = mvc.perform(post("/api/games/{gameId}/publish", draft.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsBytes(body)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        String shareCode = mapper.readTree(publishResponse).path("data").path("shareCode").asString();

        String sessionResponse = mvc.perform(post("/api/games/shared/{shareCode}/play", shareCode)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nickname\":\"Synthetic\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        selfSessionId = mapper.readTree(sessionResponse).path("data").path("sessionId").asString();
        String participantId = jdbc.queryForObject("select id from participants where game_session_id = ?",
                String.class, selfSessionId);
        String questionId = jdbc.queryForObject("select id from question_games where game_id = ? order by item_index limit 1",
                String.class, draft.getId());
        partialInteractionId = UUID.randomUUID().toString();
        jdbc.update("""
                insert into play_interaction_details
                    (id, attempts_count, duration_seconds, time_spent_ms, points_earned, answer_json,
                     correct_answer_json, participant_id, question_id, status)
                values (?, 1, 0, 1000, 0, '{"progress":true}', '{"answer":"synthetic"}', ?, ?, 'IN_PROGRESS')
                """, partialInteractionId, participantId, questionId);

        var selfSession = selfSessions.findById(selfSessionId).orElseThrow();
        selfSession.setSessionExpiresAt(LocalDateTime.now().minusMinutes(1));
        selfSessions.saveAndFlush(selfSession);

        ObjectNode metadataOnly = body.deepCopy();
        ((ObjectNode) metadataOnly.path("metadata")).put("title", "FR-07 title update with saved interaction");
        mvc.perform(put("/api/games/{gameId}", draft.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsBytes(metadataOnly)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PUBLISHED"));
        Game metadataUpdated = games.findByIdAndAuthor_Id(draft.getId(), teacher.getId()).orElseThrow();
        assertThat(metadataUpdated.getShareCode()).isEqualTo(shareCode);
        assertThat(jdbc.queryForObject("select id from question_games where game_id = ? order by item_index limit 1",
                String.class, draft.getId())).isEqualTo(questionId);
        assertThat(jdbc.queryForObject("select status from play_interaction_details where id = ?",
                String.class, partialInteractionId)).isEqualTo("IN_PROGRESS");

        ObjectNode changedGrade = metadataOnly.deepCopy();
        ((ObjectNode) changedGrade.path("metadata")).put("gradeLevel", GradeLevel.GRADE_3.name());
        mvc.perform(put("/api/games/{gameId}", draft.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsBytes(changedGrade)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("GAME_HAS_PLAY_HISTORY"));
        mvc.perform(post("/api/games/{gameId}/publish", draft.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsBytes(changedGrade)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("GAME_HAS_PLAY_HISTORY"));

        Game unchanged = games.findByIdAndAuthor_Id(draft.getId(), teacher.getId()).orElseThrow();
        assertThat(unchanged.getGrade()).isEqualTo(GradeLevel.GRADE_2);
        assertThat(unchanged.getShareCode()).isEqualTo(shareCode);
        assertThat(jdbc.queryForObject("select status from play_interaction_details where id = ?",
                String.class, partialInteractionId)).isEqualTo("IN_PROGRESS");
    }

    private QuizGameDsl loadQuizFixture() throws Exception {
        try (var stream = getClass().getResourceAsStream("/dsl-examples/quiz.json")) {
            return (QuizGameDsl) mapper.readValue(stream, GameDsl.class);
        }
    }

    private ObjectNode loadCurrentGameDsl(String gameId) throws Exception {
        String response = mvc.perform(get("/api/games/{gameId}", gameId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        ObjectNode body = (ObjectNode) mapper.readTree(response).path("data");
        body.remove("gameId");
        body.remove("status");
        body.remove("updatedAt");
        return body;
    }
}
