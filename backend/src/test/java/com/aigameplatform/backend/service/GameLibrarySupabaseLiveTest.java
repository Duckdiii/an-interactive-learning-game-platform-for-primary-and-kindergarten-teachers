package com.aigameplatform.backend.service;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.QuizGameDsl;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.security.JwtService;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;

/** Opt-in FR-17 list smoke against the explicitly approved Supabase database. */
@EnabledIfEnvironmentVariable(named = "RUN_FR17_SUPABASE_LIVE", matches = "true")
@SpringBootTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.curriculum-rag.enabled=false",
        "app.moderation.required=false",
        "app.ai.gemini.game-generation.enabled=false"
})
@AutoConfigureMockMvc
class GameLibrarySupabaseLiveTest {
    @Autowired private MockMvc mvc;
    @Autowired private JsonMapper mapper;
    @Autowired private GameRepository games;
    @Autowired private TeacherRepository teachers;
    @Autowired private GameContentStrategyRegistry strategies;
    @Autowired private JwtService jwtService;
    @Autowired private DataSource dataSource;

    private Teacher teacher;
    private Teacher emptyTeacher;
    private Game draft;
    private String accessToken;
    private String emptyTeacherAccessToken;

    @BeforeEach
    void seedSyntheticLibraryOnApprovedSupabaseHost() throws Exception {
        try (var connection = dataSource.getConnection()) {
            String jdbcUrl = connection.getMetaData().getURL();
            String expectedHost = System.getenv("FR17_SUPABASE_EXPECTED_DB_HOST");
            assertThat(expectedHost).as("set FR17_SUPABASE_EXPECTED_DB_HOST; host values are redacted")
                    .isNotBlank();
            assertThat(GameLibraryLiveDatabaseTarget.isAllowed(jdbcUrl, expectedHost))
                    .as("live test refuses an unexpected database host; host values are redacted")
                    .isTrue();
        }

        String email = "fr17-live-" + UUID.randomUUID() + "@example.invalid";
        teacher = createSyntheticTeacher(email, "FR-17 synthetic library fixture");
        accessToken = jwtService.generateAccessToken(teacher.getId(), email, "fr17-live-" + UUID.randomUUID());

        String emptyEmail = "fr17-empty-" + UUID.randomUUID() + "@example.invalid";
        emptyTeacher = createSyntheticTeacher(emptyEmail, "FR-17 empty library fixture");
        emptyTeacherAccessToken = jwtService.generateAccessToken(
                emptyTeacher.getId(), emptyEmail, "fr17-live-" + UUID.randomUUID());

        QuizGameDsl fixture;
        try (var stream = getClass().getResourceAsStream("/dsl-examples/quiz.json")) {
            fixture = (QuizGameDsl) mapper.readValue(stream, GameDsl.class);
        }
        QuizGameDsl syntheticDsl = new QuizGameDsl(fixture.schemaVersion(), fixture.gameType(),
                new GameMetadata("FR-17 synthetic library game", Subject.MATH, GradeLevel.GRADE_2,
                        "Synthetic library listing"),
                fixture.gameplaySettings(), fixture.questions());

        draft = new Game();
        draft.setAuthor(teacher);
        draft.setTitle(syntheticDsl.metadata().title());
        draft.setTopic(syntheticDsl.metadata().topic());
        draft.setGameType(GameType.QUIZ);
        draft.setSubject(Subject.MATH);
        draft.setGrade(GradeLevel.GRADE_2);
        draft.setSchemaVersion(syntheticDsl.schemaVersion());
        draft.setQuestionNum(syntheticDsl.questions().size());
        draft.setStatus(GameStatus.DRAFT);
        draft.setQuestions(new ArrayList<>(strategies.get(GameType.QUIZ).parseToQuestions(syntheticDsl)));
        draft = games.saveAndFlush(draft);
    }

    @AfterEach
    void removeSyntheticLibraryRows() {
        try {
            if (draft != null && draft.getId() != null) {
                String gameId = draft.getId();
                games.deleteById(gameId);
                games.flush();
                assertThat(games.findById(gameId)).isEmpty();
            }
        } finally {
            if (emptyTeacher != null && emptyTeacher.getId() != null) {
                String teacherId = emptyTeacher.getId();
                teachers.deleteById(teacherId);
                teachers.flush();
                assertThat(teachers.findById(teacherId)).isEmpty();
            }
            if (teacher != null && teacher.getId() != null) {
                String teacherId = teacher.getId();
                teachers.deleteById(teacherId);
                teachers.flush();
                assertThat(teachers.findById(teacherId)).isEmpty();
            }
        }
    }

    @Test
    @Timeout(90)
    void authenticatedLibraryListIsOwnerScopedFilteredAndEmptySafeOnSupabase() throws Exception {
        mvc.perform(get("/api/games").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].gameId").value(draft.getId()))
                .andExpect(jsonPath("$.data[0].title").value("FR-17 synthetic library game"))
                .andExpect(jsonPath("$.data[0].status").value("DRAFT"))
                .andExpect(jsonPath("$.data[0].questions").doesNotExist());

        mvc.perform(get("/api/games").param("status", "PUBLISHED")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));

        mvc.perform(get("/api/games").header("Authorization", "Bearer " + emptyTeacherAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));

        mvc.perform(get("/api/games"))
                .andExpect(status().isUnauthorized());
    }

    private Teacher createSyntheticTeacher(String email, String name) {
        Teacher syntheticTeacher = new Teacher();
        syntheticTeacher.setEmail(email);
        syntheticTeacher.setFullName(name);
        syntheticTeacher.setPasswordHash("not-a-login-credential");
        return teachers.saveAndFlush(syntheticTeacher);
    }
}

final class GameLibraryLiveDatabaseTarget {
    private GameLibraryLiveDatabaseTarget() {}

    static boolean isAllowed(String jdbcUrl, String expectedHost) {
        if (jdbcUrl == null || expectedHost == null || expectedHost.isBlank()) return false;
        try {
            URI uri = URI.create(jdbcUrl.trim().replaceFirst("(?i)^jdbc:", ""));
            String host = uri.getHost();
            String normalizedHost = host == null ? "" : host.toLowerCase(Locale.ROOT);
            return "postgresql".equalsIgnoreCase(uri.getScheme())
                    && host != null
                    && host.equalsIgnoreCase(expectedHost)
                    && (normalizedHost.endsWith(".supabase.co") || normalizedHost.endsWith(".supabase.com"))
                    && uri.getPort() != 6543;
        } catch (IllegalArgumentException malformedUrl) {
            return false;
        }
    }
}
