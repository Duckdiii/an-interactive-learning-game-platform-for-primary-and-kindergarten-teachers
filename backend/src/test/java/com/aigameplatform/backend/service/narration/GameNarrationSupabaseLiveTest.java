package com.aigameplatform.backend.service.narration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.GameNarrationAsset;
import com.aigameplatform.backend.entity.SharedNarrationAsset;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.question.QuizQuestion;
import com.aigameplatform.backend.repository.GameNarrationAssetRepository;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.SharedNarrationAssetRepository;
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
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.sql.DataSource;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.env.Environment;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Opt-in FR-11 end-to-end smoke using the real Supabase database, ElevenLabs TTS, and Storage. */
@EnabledIfSystemProperty(named = "fr11.supabase.live", matches = "true")
@SpringBootTest(properties = {
        "spring.jpa.hibernate.ddl-auto=validate",
        "spring.datasource.hikari.maximum-pool-size=3",
        "spring.flyway.validate-on-migrate=false",
        "spring.flyway.ignore-migration-patterns=*:missing,*:future",
        "app.curriculum-rag.enabled=false",
        "app.moderation.required=false",
        "app.ai.gemini.game-generation.enabled=false"
})
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
class GameNarrationSupabaseLiveTest {
    private static final Pattern UPSTREAM_HTTP_STATUS = Pattern.compile("\\bHTTP\\s+(\\d{3})\\b", Pattern.CASE_INSENSITIVE);
    private static final Map<String, String> SAFE_AUDIO_FAILURES = Map.of(
            "TTS response is empty", "empty_audio",
            "MP3 exceeds 256 KiB per file", "audio_size_limit",
            "TTS response contains an invalid or truncated MP3 frame", "invalid_mp3_frame",
            "MP3 exceeds 30 seconds per file", "audio_duration_limit",
            "TTS response contains trailing bytes outside the MP3 stream", "invalid_mp3_trailing_bytes",
            "TTS response is not a valid MP3", "invalid_mp3",
            "Unable to read ElevenLabs TTS audio response", "audio_read_failed");
    private static final String AUDIO_TEXT = "Choose the correct answer: two plus two.";
    private static final String FEEDBACK_CACHE_VERSION = "fr11-live-"
            + UUID.randomUUID().toString().replace("-", "").substring(0, 22);

    @DynamicPropertySource
    static void useIsolatedFeedbackCacheVersion(DynamicPropertyRegistry properties) {
        properties.add("app.narration.feedback-cache-version", () -> FEEDBACK_CACHE_VERSION);
    }

    @Autowired private MockMvc mvc;
    @Autowired private JsonMapper mapper;
    @Autowired private GameRepository games;
    @Autowired private TeacherRepository teachers;
    @Autowired private GameNarrationAssetRepository narrationAssets;
    @Autowired private SharedNarrationAssetRepository sharedNarrationAssets;
    @Autowired private JwtService jwtService;
    @Autowired private DataSource dataSource;
    @Autowired private SupabaseNarrationStorage storage;
    @Autowired private Environment environment;

    private Teacher teacher;
    private Game game;
    private String accessToken;

    @BeforeEach
    void createSyntheticGameOnTheApprovedSupabaseHost() throws Exception {
        try (var connection = dataSource.getConnection()) {
            String jdbcUrl = connection.getMetaData().getURL().toLowerCase(Locale.ROOT);
            String expectedHost = environment.getProperty("FR11_SUPABASE_EXPECTED_DB_HOST");
            if (expectedHost == null || expectedHost.isBlank()) {
                expectedHost = URI.create(environment.getRequiredProperty("DB_URL").replaceFirst("^jdbc:", ""))
                        .getHost();
            }
            String actualHost = URI.create(jdbcUrl.replaceFirst("^jdbc:", "")).getHost();
            assertThat(jdbcUrl.contains("supabase") && !jdbcUrl.contains(":6543"))
                    .as("live test requires Supabase direct/session pooler; JDBC URL is redacted")
                    .isTrue();
            assertThat(expectedHost != null && !expectedHost.isBlank())
                    .as("expected database host is derived from configured DB_URL or FR11_SUPABASE_EXPECTED_DB_HOST")
                    .isTrue();
            assertThat(actualHost != null && actualHost.equalsIgnoreCase(expectedHost))
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
        question.setText("What is two plus two?");
        question.setOptions(List.of("Three", "Four"));
        question.setCorrectIndex(1);

        game = new Game();
        game.setAuthor(teacher);
        game.setTitle("FR-11 synthetic narration smoke");
        game.setTopic("Synthetic TTS acceptance fixture");
        game.setGameType(GameType.QUIZ);
        game.setQuestionNum(1);
        game.setGrade(GradeLevel.GRADE_2);
        game.setSubject(Subject.ENGLISH);
        game.setSchemaVersion("1.0.0");
        game.setStatus(GameStatus.DRAFT);
        game.setQuestions(new ArrayList<>(List.of(question)));
        game = games.saveAndFlush(game);

        accessToken = jwtService.generateAccessToken(teacher.getId(), email, "fr11-live-" + UUID.randomUUID());
    }

    @AfterEach
    void removeSyntheticRowsAndAudio() {
        List<String> failures = new ArrayList<>();
        List<SharedNarrationAsset> feedbackAssets = new ArrayList<>();
        safeCleanup("read feedback cache rows", () -> sharedNarrationAssets.findAll().stream()
                .filter(asset -> FEEDBACK_CACHE_VERSION.equals(asset.getPhraseVersion()))
                .forEach(feedbackAssets::add), failures);
        List<String> feedbackPaths = feedbackAssets.stream().map(SharedNarrationAsset::getStoragePath).toList();
        if (!feedbackPaths.isEmpty()) {
            safeCleanup("delete feedback Storage objects", () -> storage.delete(feedbackPaths), failures);
        }
        safeCleanup("delete feedback cache rows", () -> {
            sharedNarrationAssets.deleteAll(feedbackAssets);
            sharedNarrationAssets.flush();
            assertThat(sharedNarrationAssets.findAll().stream()
                    .noneMatch(asset -> FEEDBACK_CACHE_VERSION.equals(asset.getPhraseVersion()))).isTrue();
        }, failures);
        for (String path : feedbackPaths) {
            safeCleanup("verify feedback Storage object removal", () -> assertThat(listStorageObjects(path)).isEmpty(),
                    failures);
        }

        if (game != null && game.getId() != null) {
            String gameId = game.getId();
            List<GameNarrationAsset> assets = new ArrayList<>();
            safeCleanup("read game narration rows", () -> assets.addAll(narrationAssets.findAllByGame_Id(gameId)),
                    failures);
            List<String> paths = assets.stream().map(GameNarrationAsset::getStoragePath).toList();
            if (!paths.isEmpty()) {
                safeCleanup("delete game narration Storage objects", () -> storage.delete(paths), failures);
            }
            safeCleanup("delete game narration rows", () -> {
                narrationAssets.deleteAll(assets);
                narrationAssets.flush();
                assertThat(narrationAssets.findAllByGame_Id(gameId)).isEmpty();
            }, failures);
            safeCleanup("delete synthetic game", () -> {
                games.deleteById(gameId);
                games.flush();
                assertThat(games.findById(gameId)).isEmpty();
            }, failures);
            for (String path : paths) {
                safeCleanup("verify game narration Storage object removal",
                        () -> assertThat(listStorageObjects(path)).isEmpty(), failures);
            }
            safeCleanup("verify game Storage prefix removal", () -> assertThat(listStorageObjects(gameId)).isEmpty(),
                    failures);
        }

        if (teacher != null && teacher.getId() != null) {
            String teacherId = teacher.getId();
            safeCleanup("delete synthetic teacher", () -> {
                teachers.deleteById(teacherId);
                teachers.flush();
                assertThat(teachers.findById(teacherId)).isEmpty();
            }, failures);
        }

        if (!failures.isEmpty()) {
            throw new AssertionError("Supabase smoke cleanup failed: " + String.join(", ", failures));
        }
    }

    private static void safeCleanup(String step, Runnable cleanup, List<String> failures) {
        try {
            cleanup.run();
        } catch (RuntimeException | AssertionError failure) {
            failures.add(step + " (" + failure.getClass().getSimpleName() + ")");
        }
    }

    @Test
    @Timeout(180)
    void authenticatedEnglishPreviewAndFeedbackUseRealElevenLabsAndSupabaseWithCacheReuse() throws Exception {
        ObjectNode request = mapper.createObjectNode().put("questionId", "q1");
        MvcResult result = requireOk(mvc.perform(post("/api/games/{gameId}/narration/preview", game.getId())
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsBytes(request)))
                .andReturn(), "English question narration preview");

        JsonNode data = mapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8)).path("data");
        assertThat(data.path("questionId").asString()).isEqualTo("q1");
        assertThat(data.path("bytes").asInt()).isPositive().isLessThanOrEqualTo(Mp3AudioValidator.MAX_FILE_BYTES);
        assertThat(data.path("durationMillis").asInt()).isPositive()
                .isLessThanOrEqualTo((int) (Mp3AudioValidator.MAX_DURATION_SECONDS * 1000));
        String signedUrl = data.path("audioUrl").asString();
        assertThat(signedUrl.startsWith("https://")).as("question URL is a signed HTTPS URL").isTrue();

        List<GameNarrationAsset> savedAssets = narrationAssets.findAllByGame_Id(game.getId());
        assertThat(savedAssets).hasSize(1);
        GameNarrationAsset savedAsset = savedAssets.get(0);
        assertThat(savedAsset.getStoragePath()).startsWith(game.getId() + "/");
        assertThat(savedAsset.getByteLength()).isEqualTo(data.path("bytes").asInt());
        assertThat(savedAsset.getDurationMillis()).isEqualTo(data.path("durationMillis").asInt());

        byte[] questionAudio = downloadAndValidate(signedUrl);
        assertThat(questionAudio.length).isEqualTo(data.path("bytes").asInt());
        double durationSeconds = new Mp3AudioValidator().validate(questionAudio);
        assertThat((int) Math.ceil(durationSeconds * 1000)).isEqualTo(data.path("durationMillis").asInt());
        assertThat(listStorageObjects(""))
                .anyMatch(object -> game.getId().equals(object.get("name")));

        assertThat(feedbackAssetSnapshot()).isEmpty();
        JsonNode firstFeedback = requestFeedback();
        String correctUrl = firstFeedback.path("correctAudioUrl").asString();
        String wrongUrl = firstFeedback.path("wrongAudioUrl").asString();
        assertThat(correctUrl.startsWith("https://") && wrongUrl.startsWith("https://"))
                .as("feedback URLs are signed HTTPS URLs").isTrue();
        byte[] correctAudio = downloadAndValidate(correctUrl);
        byte[] wrongAudio = downloadAndValidate(wrongUrl);

        List<FeedbackAssetSnapshot> firstCache = feedbackAssetSnapshot();
        assertThat(firstCache).extracting(FeedbackAssetSnapshot::phraseKey)
                .containsExactlyInAnyOrder("correct", "wrong");
        assertThat(firstCache).allSatisfy(asset -> {
            assertThat(asset.language()).isEqualTo("en");
            assertThat(asset.provider()).isEqualTo("elevenlabs");
            assertThat(asset.byteLength()).isBetween(4, Mp3AudioValidator.MAX_FILE_BYTES);
            assertThat(asset.durationMillis()).isBetween(1, (int) (Mp3AudioValidator.MAX_DURATION_SECONDS * 1000));
        });
        assertThat(correctAudio.length).isEqualTo(firstCache.stream()
                .filter(asset -> "correct".equals(asset.phraseKey())).findFirst().orElseThrow().byteLength());
        assertThat(wrongAudio.length).isEqualTo(firstCache.stream()
                .filter(asset -> "wrong".equals(asset.phraseKey())).findFirst().orElseThrow().byteLength());

        JsonNode secondFeedback = requestFeedback();
        assertThat(URI.create(secondFeedback.path("correctAudioUrl").asString()).getPath())
                .isEqualTo(URI.create(correctUrl).getPath());
        assertThat(URI.create(secondFeedback.path("wrongAudioUrl").asString()).getPath())
                .isEqualTo(URI.create(wrongUrl).getPath());
        assertThat(feedbackAssetSnapshot()).containsExactlyElementsOf(firstCache);
    }

    private JsonNode requestFeedback() throws Exception {
        MvcResult result = requireOk(mvc.perform(post("/api/games/{gameId}/narration/feedback", game.getId())
                        .header("Authorization", "Bearer " + accessToken))
                .andReturn(), "English answer feedback narration");
        return mapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8)).path("data");
    }

    private static MvcResult requireOk(MvcResult result, String operation) {
        if (result.getResponse().getStatus() == 200) return result;
        String detail = safeFailureDetail(result.getResolvedException());
        throw new AssertionError(operation + " returned HTTP " + result.getResponse().getStatus() + " (" + detail + ")");
    }

    private static String safeFailureDetail(Throwable failure) {
        List<String> causeTypes = new ArrayList<>();
        for (Throwable cause = failure; cause != null && causeTypes.size() < 8; cause = cause.getCause()) {
            causeTypes.add(cause.getClass().getSimpleName());
            if (cause instanceof RestClientResponseException responseFailure) {
                return String.join(" -> ", causeTypes) + " upstreamStatus=" + responseFailure.getStatusCode().value();
            }
            if (cause.getMessage() == null) continue;
            String safeAudioFailure = SAFE_AUDIO_FAILURES.get(cause.getMessage());
            if (safeAudioFailure != null) return String.join(" -> ", causeTypes) + " reason=" + safeAudioFailure;
            Matcher status = UPSTREAM_HTTP_STATUS.matcher(cause.getMessage());
            if (status.find()) return String.join(" -> ", causeTypes) + " upstreamStatus=" + status.group(1);
        }
        return causeTypes.isEmpty() ? "cause unavailable" : String.join(" -> ", causeTypes);
    }

    private byte[] downloadAndValidate(String signedUrl) throws Exception {
        assertThat(signedUrl.startsWith("https://")).as("Supabase audio URL uses HTTPS").isTrue();
        HttpResponse<byte[]> response = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build()
                .send(HttpRequest.newBuilder(URI.create(signedUrl)).timeout(Duration.ofSeconds(30)).GET().build(),
                        HttpResponse.BodyHandlers.ofByteArray());
        assertThat(response.statusCode() == 200).as("signed Supabase URL downloads successfully").isTrue();
        assertThat(response.body().length).isBetween(4, Mp3AudioValidator.MAX_FILE_BYTES);
        double durationSeconds = new Mp3AudioValidator().validate(response.body());
        assertThat(durationSeconds > 0 && durationSeconds <= Mp3AudioValidator.MAX_DURATION_SECONDS)
                .as("downloaded audio duration is within the MP3 limit").isTrue();
        return response.body();
    }

    private List<FeedbackAssetSnapshot> feedbackAssetSnapshot() {
        return sharedNarrationAssets.findAll().stream()
                .filter(asset -> FEEDBACK_CACHE_VERSION.equals(asset.getPhraseVersion()))
                .map(asset -> new FeedbackAssetSnapshot(asset.getPhraseKey(), asset.getCacheKey(), asset.getStoragePath(),
                        asset.getLanguage(), asset.getProvider(), asset.getByteLength(), asset.getDurationMillis()))
                .sorted(java.util.Comparator.comparing(FeedbackAssetSnapshot::phraseKey))
                .toList();
    }

    private record FeedbackAssetSnapshot(String phraseKey, String cacheKey, String storagePath, String language,
            String provider, int byteLength, int durationMillis) { }

    private List<Map<String, Object>> listStorageObjects(String prefix) {
        String storageUrl = environment.getRequiredProperty("SUPABASE_URL").replaceAll("/+$", "");
        String serviceRoleKey = environment.getRequiredProperty("SUPABASE_SERVICE_ROLE_KEY");
        String bucket = environment.getProperty("TTS_STORAGE_BUCKET", "game-narration");
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
