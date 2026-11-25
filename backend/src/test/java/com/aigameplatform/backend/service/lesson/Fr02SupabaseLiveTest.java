package com.aigameplatform.backend.service.lesson;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.dto.request.GenerateGameRequest;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.security.JwtService;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;
import jakarta.persistence.EntityManager;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.http.MediaType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Opt-in live smoke: real Supabase PostgreSQL and Gemini with local-only safety checks;
 * synthetic lesson content only. Run with Flyway disabled and schema validation enabled.
 */
@EnabledIfEnvironmentVariable(named = "RUN_FR02_SUPABASE_LIVE", matches = "true")
@SpringBootTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.curriculum-rag.enabled=false",
        "app.moderation.required=false",
        "app.ai.gemini.game-generation.enabled=true",
        "debug=false",
        "logging.level.org.hibernate.orm.connections.pooling=OFF",
        "logging.level.org.springframework.boot.autoconfigure.logging.ConditionEvaluationReportLogger=OFF"
})
@AutoConfigureMockMvc
class Fr02SupabaseLiveTest {
    private static final String LESSON_TEXT = "Lesson plan. Grade 2 Mathematics. Learning objective: identify squares and triangles in classroom objects. Practice counting up to five objects. Use only the shapes and number range stated here.";
    private static final String TEACHER_ID_QUERY = "select count(g) from Game g where g.author.id = :teacherId";

    @Autowired private TeacherRepository teachers;
    @Autowired private GameRepository games;
    @Autowired private LessonPreparationService lessonPreparation;
    @Autowired private EntityManager entityManager;
    @Autowired private DataSource dataSource;
    @Autowired private MockMvc mvc;
    @Autowired private JsonMapper mapper;
    @Autowired private JwtService jwtService;

    private Teacher teacher;
    private AuthenticatedTeacher principal;
    private String accessToken;

    @BeforeEach
    void createSyntheticTeacher() throws Exception {
        try (var connection = dataSource.getConnection()) {
            String jdbcUrl = connection.getMetaData().getURL();
            String expectedHost = System.getenv("FR02_SUPABASE_EXPECTED_DB_HOST");
            assertThat(expectedHost).as("set FR02_SUPABASE_EXPECTED_DB_HOST to the explicitly approved test database host")
                    .isNotBlank();
            assertThat(Fr02LiveDatabaseTarget.isAllowed(jdbcUrl, expectedHost))
                    .as("live test refuses an unexpected database host; host values are redacted")
                    .isTrue();
        }
        String email = "fr02-live-" + UUID.randomUUID() + "@example.invalid";
        Teacher candidate = new Teacher();
        candidate.setEmail(email);
        candidate.setFullName("FR-02 synthetic Supabase fixture");
        candidate.setPasswordHash("not-a-login-credential");
        teacher = teachers.saveAndFlush(candidate);
        principal = new AuthenticatedTeacher(teacher.getId(), email, "fr02-live-" + UUID.randomUUID());
        accessToken = jwtService.generateAccessToken(teacher.getId(), email, "fr02-live-" + UUID.randomUUID());
    }

    @AfterEach
    void removeSyntheticRows() {
        if (teacher == null || teacher.getId() == null) return;
        List<String> ownedGameIds = entityManager.createQuery(
                "select g.id from Game g where g.author.id = :teacherId", String.class)
                .setParameter("teacherId", teacher.getId()).getResultList();
        for (String gameId : ownedGameIds) games.deleteById(gameId);
        games.flush();
        teachers.deleteById(teacher.getId());
        teachers.flush();
        entityManager.clear();
        assertThat(gamesForSyntheticTeacher()).isZero();
        assertThat(teachers.findById(teacher.getId())).isEmpty();
    }

    @Test
    @Timeout(value = 5, unit = TimeUnit.MINUTES)
    void syntheticLessonCanBePreparedConfirmedAndPersistedAsOwnedDraft() throws Exception {
        long gamesBefore = gamesForSyntheticTeacher();
        var upload = new MockMultipartFile("file", "fr02-synthetic-lesson.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", syntheticDocx());

        var prepareResponse = mvc.perform(multipart("/api/games/prepare").file(upload)
                        .param("subject", Subject.MATH.name())
                        .param("gradeLevel", GradeLevel.GRADE_2.name())
                        .param("idea", "Create a simple quiz about squares and triangles, limited to the lesson objective.")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.idea").isString())
                .andReturn();
        String preparedIdea = mapper.readTree(prepareResponse.getResponse().getContentAsString())
                .path("data").path("idea").asText();

        assertThat(preparedIdea).isNotBlank()
                .hasSizeGreaterThanOrEqualTo(LessonPreparationService.IDEA_MIN_LENGTH)
                .hasSizeLessThanOrEqualTo(LessonPreparationService.IDEA_MAX_LENGTH);
        assertThat(gamesForSyntheticTeacher()).as("prepare must not save a game before teacher confirmation")
                .isEqualTo(gamesBefore);

        var request = new GenerateGameRequest(Subject.MATH, GradeLevel.GRADE_2, preparedIdea, false,
                GameType.QUIZ, null, null, null, mapper.createObjectNode().put("region", "NORTH").put("gender", "FEMALE"));
        var generateResponse = mvc.perform(post("/api/games/generate")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsBytes(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andReturn();
        var response = mapper.readTree(generateResponse.getResponse().getContentAsString()).path("data");

        String gameId = response.path("gameId").asText();
        assertThat(gameId).isNotBlank();
        assertThat(response.path("status").asText()).isEqualTo("DRAFT");
        Game persisted = games.findByIdAndAuthor_Id(gameId, teacher.getId()).orElseThrow();
        assertThat(persisted.getStatus()).isEqualTo(GameStatus.DRAFT);
        assertThat(persisted.getAuthor().getId()).isEqualTo(teacher.getId());
        assertThat(persisted.getQuestionNum()).isPositive();
        assertThat(games.findByIdAndAuthor_Id(gameId, "not-the-owner")).isEmpty();
        assertThat(gamesForSyntheticTeacher()).isEqualTo(gamesBefore + 1);
    }

    @Test
    void corruptLessonFailsBeforeAnyGameIsSaved() {
        long gamesBefore = gamesForSyntheticTeacher();
        var corrupt = new MockMultipartFile("file", "corrupt.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document", new byte[] {1, 2, 3});

        assertThatThrownBy(() -> lessonPreparation.prepare(Subject.MATH, GradeLevel.GRADE_2,
                null, corrupt, principal))
                .isInstanceOfSatisfying(ApiException.class,
                        error -> assertThat(error.getErrorCode()).isEqualTo(ErrorCode.FILE_TOO_LARGE_OR_INVALID_FORMAT));
        assertThat(gamesForSyntheticTeacher()).isEqualTo(gamesBefore);
    }

    private long gamesForSyntheticTeacher() {
        if (teacher == null || teacher.getId() == null) return 0;
        return entityManager.createQuery(TEACHER_ID_QUERY, Long.class)
                .setParameter("teacherId", teacher.getId()).getSingleResult();
    }

    private static byte[] syntheticDocx() throws Exception {
        var output = new ByteArrayOutputStream();
        try (var zip = new ZipOutputStream(output)) {
            addPart(zip, "[Content_Types].xml", """
                    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>
                    """);
            addPart(zip, "_rels/.rels", """
                    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>
                    """);
            addPart(zip, "word/document.xml", "<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:body><w:p><w:r><w:t>"
                    + LESSON_TEXT + "</w:t></w:r></w:p></w:body></w:document>");
        }
        return output.toByteArray();
    }

    private static void addPart(ZipOutputStream zip, String name, String content) throws Exception {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(content.getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }
}
