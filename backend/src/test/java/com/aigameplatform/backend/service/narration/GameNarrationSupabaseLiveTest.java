package com.aigameplatform.backend.service.narration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.GameNarrationAsset;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.question.QuizQuestion;
import com.aigameplatform.backend.repository.GameNarrationAssetRepository;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.security.JwtService;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Opt-in FR-11 end-to-end smoke using the real Supabase database, Viettel TTS, and Storage. */
@EnabledIfSystemProperty(named = "fr11.supabase.live", matches = "true")
@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "app.curriculum-rag.enabled=false",
        "app.moderation.required=false",
        "app.ai.gemini.game-generation.enabled=false"
})
@AutoConfigureMockMvc
class GameNarrationSupabaseLiveTest {
    private static final String AUDIO_TEXT = "Hãy chọn kết quả phép tính hai cộng hai.";

    @Autowired private MockMvc mvc;
    @Autowired private JsonMapper mapper;
    @Autowired private GameRepository games;
    @Autowired private TeacherRepository teachers;
    @Autowired private GameNarrationAssetRepository narrationAssets;
    @Autowired private JwtService jwtService;
    @Autowired private DataSource dataSource;
    @Autowired private SupabaseNarrationStorage storage;

    private Teacher teacher;
    private Game game;
    private String accessToken;

    @BeforeEach
    void createSyntheticGameOnTheApprovedSupabaseHost() throws Exception {
        try (var connection = dataSource.getConnection()) {
            String jdbcUrl = connection.getMetaData().getURL().toLowerCase(Locale.ROOT);
            String expectedHost = System.getenv("FR11_SUPABASE_EXPECTED_DB_HOST");
            String actualHost = URI.create(jdbcUrl.replaceFirst("^jdbc:", "")).getHost();
            assertThat(jdbcUrl.contains("supabase") && !jdbcUrl.contains(":6543"))
                    .as("live test requires Supabase direct/session pooler; JDBC URL is redacted")
                    .isTrue();
            assertThat(expectedHost).as("test runner must set FR11_SUPABASE_EXPECTED_DB_HOST; host values are redacted")
                    .isNotBlank();
            assertThat(actualHost.equalsIgnoreCase(expectedHost))
                    .as("live test refuses an unexpected database host; host values are redacted")
                    .isTrue();
        }

        String email = "fr11-live-" + UUID.randomUUID() + "@example.invalid";
        teacher = new Teacher();
        teacher.setEmail(email);
        teacher.setFullName("FR-11 synthetic narration fixture");
        teacher.setPasswordHash("not-a-login-credential");
        teacher = teachers.saveAndFlush(teacher);

        QuizQuestion question = new QuizQuestion();
        question.setItemIndex(0);
        question.setTimeLimit(30);
        question.setPoint(10);
        question.setAudioText(AUDIO_TEXT);
        question.setText("2 + 2 = ?");
        question.setOptions(List.of("3", "4"));
        question.setCorrectIndex(1);

        game = new Game();
        game.setAuthor(teacher);
        game.setTitle("FR-11 synthetic narration smoke");
        game.setTopic("Synthetic TTS acceptance fixture");
        game.setGameType(GameType.QUIZ);
        game.setQuestionNum(1);
        game.setGrade(GradeLevel.GRADE_2);
        game.setSubject(Subject.MATH);
        game.setSchemaVersion("1.0.0");
        game.setStatus(GameStatus.DRAFT);
        game.setQuestions(new ArrayList<>(List.of(question)));
        game = games.saveAndFlush(game);

        accessToken = jwtService.generateAccessToken(teacher.getId(), email, "fr11-live-" + UUID.randomUUID());
    }

    @AfterEach
    void removeSyntheticRowsAndAudio() {
        try {
            if (game != null && game.getId() != null) {
                String gameId = game.getId();
                List<GameNarrationAsset> assets = narrationAssets.findAllByGame_Id(gameId);
                List<String> paths = assets.stream().map(GameNarrationAsset::getStoragePath).toList();
                if (!paths.isEmpty()) storage.delete(paths);
                narrationAssets.deleteAll(assets);
                narrationAssets.flush();
                games.deleteById(gameId);
                games.flush();
                assertThat(narrationAssets.findAllByGame_Id(gameId)).isEmpty();
                assertThat(games.findById(gameId)).isEmpty();
                if (!paths.isEmpty()) {
                    assertThat(listStorageObjects(""))
                            .noneMatch(object -> gameId.equals(object.get("name")));
                }
            }
        } finally {
            if (teacher != null && teacher.getId() != null) {
                String teacherId = teacher.getId();
                teachers.deleteById(teacherId);
                teachers.flush();
                assertThat(teachers.findById(teacherId)).isEmpty();
            }
        }
    }

    @Test
    @Timeout(180)
    void authenticatedPreviewGeneratesPersistsAndServesRealTtsAudio() throws Exception {
        ObjectNode request = mapper.createObjectNode().put("questionId", "q1");
        MvcResult result = mvc.perform(post("/api/games/{gameId}/narration/preview", game.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsBytes(request)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode data = mapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8)).path("data");
        assertThat(data.path("questionId").asString()).isEqualTo("q1");
        assertThat(data.path("bytes").asInt()).isPositive().isLessThanOrEqualTo(Mp3AudioValidator.MAX_FILE_BYTES);
        assertThat(data.path("durationMillis").asInt()).isPositive()
                .isLessThanOrEqualTo((int) (Mp3AudioValidator.MAX_DURATION_SECONDS * 1000));
        String signedUrl = data.path("audioUrl").asString();
        assertThat(signedUrl).startsWith("https://");

        List<GameNarrationAsset> savedAssets = narrationAssets.findAllByGame_Id(game.getId());
        assertThat(savedAssets).hasSize(1);
        GameNarrationAsset savedAsset = savedAssets.get(0);
        assertThat(savedAsset.getStoragePath()).startsWith(game.getId() + "/");
        assertThat(savedAsset.getByteLength()).isEqualTo(data.path("bytes").asInt());
        assertThat(savedAsset.getDurationMillis()).isEqualTo(data.path("durationMillis").asInt());

        HttpResponse<byte[]> download = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build()
                .send(HttpRequest.newBuilder(URI.create(signedUrl)).timeout(Duration.ofSeconds(30)).GET().build(),
                        HttpResponse.BodyHandlers.ofByteArray());
        assertThat(download.statusCode()).isEqualTo(200);
        assertThat(download.body()).hasSize(data.path("bytes").asInt());
        double durationSeconds = new Mp3AudioValidator().validate(download.body());
        assertThat((int) Math.ceil(durationSeconds * 1000)).isEqualTo(data.path("durationMillis").asInt());
        assertThat(listStorageObjects(""))
                .anyMatch(object -> game.getId().equals(object.get("name")));
    }

    private List<Map<String, Object>> listStorageObjects(String prefix) {
        String storageUrl = System.getenv("SUPABASE_URL").replaceAll("/+$", "");
        String serviceRoleKey = System.getenv("SUPABASE_SERVICE_ROLE_KEY");
        String bucket = System.getenv().getOrDefault("TTS_STORAGE_BUCKET", "game-narration");
        List<Map<String, Object>> objects = RestClient.builder().build().post()
                .uri(storageUrl + "/storage/v1/object/list/" + bucket)
                .headers(headers -> {
                    headers.setBearerAuth(serviceRoleKey);
                    headers.set("apikey", serviceRoleKey);
                })
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("prefix", prefix, "limit", 100, "offset", 0))
                .retrieve()
                .body(new ParameterizedTypeReference<>() { });
        return objects == null ? List.of() : objects;
    }
}
