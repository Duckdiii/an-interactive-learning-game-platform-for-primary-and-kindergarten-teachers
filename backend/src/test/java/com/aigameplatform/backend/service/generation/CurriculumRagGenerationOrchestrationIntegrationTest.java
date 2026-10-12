package com.aigameplatform.backend.service.generation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.CurriculumEvidenceNotFoundException;
import com.aigameplatform.backend.service.curriculum.CurriculumContextProvider;
import com.aigameplatform.backend.service.curriculum.CurriculumDataset;
import com.aigameplatform.backend.service.curriculum.CurriculumDatasetCatalog;
import com.aigameplatform.backend.service.curriculum.CurriculumRAGService;
import com.aigameplatform.backend.service.curriculum.RagSpikeConfig;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.service.generation.GameContentGenerator;
import com.aigameplatform.backend.service.generation.GameGenerationService;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.testsupport.GameTestFixtures;
import com.aigameplatform.backend.service.validation.GameValidationService;
import com.aigameplatform.backend.service.validation.ai.AiOutputValidator;
import com.aigameplatform.backend.service.validation.safety.ContentModerationClient;
import com.aigameplatform.backend.service.validation.safety.ModerationResult;
import com.sun.net.httpserver.HttpServer;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.chat.Capability;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Service integration through the production service, strategies, Gemini adapter, factories and validators.
 * Gemini HTTP is redirected to a local protocol stub; embeddings use reviewed files and a deterministic in-memory store.
 * Moderation uses a deterministic configured test double so the production validation chain is exercised without a vendor call.
 */
@SpringBootTest(properties = {
        "app.jwt.secret=curriculum-orchestration-test-key-with-more-than-thirty-two-bytes",
        "spring.datasource.url=jdbc:h2:mem:curriculum-orchestration;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=none",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.flyway.enabled=false",
        "app.curriculum-rag.enabled=false",
        "app.ai.gemini.api-key=integration-test-only",
        "app.ai.gemini.model=gemini-3.5-flash-lite",
        "app.ai.gemini.game-generation.enabled=true"
})
@Import(CurriculumRagGenerationOrchestrationIntegrationTest.TestWiring.class)
class CurriculumRagGenerationOrchestrationIntegrationTest {

    private static final LocalGeminiServer GEMINI = LocalGeminiServer.start();

    @Autowired private GameGenerationService generation;
    @Autowired private LocalGeminiServer server;
    @Autowired private CurriculumRAGService rag;
    @Autowired private RecordingCurriculumContextProvider curriculum;
    @Autowired private RecordingModerationClient moderation;
    @Autowired private JsonMapper mapper;

    @BeforeEach
    void resetLocalProvider() {
        server.reset();
        server.setGameType(GameType.QUIZ);
        moderation.reset();
        curriculum.reset();
    }

    @AfterAll
    static void stopLocalProvider() {
        GEMINI.stop();
    }

    @Test
    void allFifteenPreparedScopesRunPositiveAndInsufficientCasesThroughTheManagedService() throws Exception {
        JsonNode cases = mapper.readTree(Files.readString(matrixPath(), StandardCharsets.UTF_8)).get("cases");
        assertThat(cases).hasSize(30);
        int positive = 0;
        int insufficient = 0;

        for (JsonNode testCase : cases) {
            Subject subject = Subject.valueOf(testCase.get("subject").asString());
            GradeLevel grade = GradeLevel.valueOf(testCase.get("gradeLevel").asString());
            GameType gameType = GameType.valueOf(testCase.get("gameType").asString());
            String topic = testCase.get("topic").asString();
            server.setGameType(gameType);

            if ("SUPPORTED".equals(testCase.get("caseKind").asString())) {
                int requestsBefore = server.requestCount();
                var game = generation.generate(gameType, new GameDslRequest(topic, subject, grade));
                assertThat(game.gameType()).isEqualTo(gameType);
                assertThat(game.metadata().subject()).isEqualTo(subject);
                assertThat(game.metadata().gradeLevel()).isEqualTo(grade);
                assertThat(server.requestCount()).isGreaterThan(requestsBefore);
                assertThat(curriculum.lastResult().status()).isEqualTo(CurriculumRAGService.Status.FOUND);
                var expectedIds = new ArrayList<String>();
                testCase.get("expectedEvidenceChunkIds").forEach(id -> expectedIds.add(id.asString()));
                assertThat(expectedIds).isNotEmpty();
                assertThat(curriculum.lastResult().chunks()).isNotEmpty().allSatisfy(chunk -> {
                    assertThat(chunk.subject()).isEqualTo(subject);
                    assertThat(chunk.gradeLevel()).isEqualTo(grade);
                    assertThat(chunk.topic()).isEqualTo(topic);
                });
                String retrievedChunkId = curriculum.lastResult().chunks().getFirst().chunkId();
                for (JsonNode sent : server.requests().subList(requestsBefore, server.requestCount())) {
                    String systemPrompt = sent.at("/systemInstruction/parts/0/text").asString();
                    assertThat(systemPrompt).contains(topic).contains(retrievedChunkId);
                    assertThat(sent.at("/generationConfig/responseMimeType").asString()).isEqualTo("application/json");
                    assertThat(sent.at("/generationConfig/responseJsonSchema").isObject()
                            || sent.at("/generationConfig/responseSchema").isObject()).isTrue();
                }
                assertThat(curriculum.calls()).isEqualTo(positive + insufficient + 1);
                positive++;
            } else {
                int chatCallsBefore = server.requestCount();
                assertThatThrownBy(() -> generation.generate(gameType,
                        new GameDslRequest(topic, subject, grade)))
                        .isInstanceOf(CurriculumEvidenceNotFoundException.class);
                assertThat(server.requestCount()).isEqualTo(chatCallsBefore);
                assertThat(curriculum.lastResult().status())
                        .isEqualTo(CurriculumRAGService.Status.INSUFFICIENT_EVIDENCE);
                insufficient++;
            }
        }

        assertThat(positive).isEqualTo(15);
        assertThat(insufficient).isEqualTo(15);
        assertThat(curriculum.calls()).isEqualTo(30);
        assertThat(server.requestCount()).isGreaterThanOrEqualTo(15);
        assertThat(moderation.calls()).isEqualTo(15);
    }

    @Test
    void retryKeepsRetrievedEvidenceAndStructuredSchemaInTheSystemRequest() throws Exception {
        JsonNode supported = mapper.readTree(Files.readString(matrixPath(), StandardCharsets.UTF_8)).get("cases")
                .valueStream().filter(row -> "SUPPORTED".equals(row.get("caseKind").asString())).findFirst().orElseThrow();
        server.returnInvalidOutputOnce();

        generation.generate(GameType.QUIZ, new GameDslRequest(supported.get("topic").asString(),
                Subject.valueOf(supported.get("subject").asString()),
                GradeLevel.valueOf(supported.get("gradeLevel").asString())));

        assertThat(server.requestCount()).isEqualTo(2);
        assertThat(curriculum.calls()).isEqualTo(1);
        assertThat(moderation.calls()).isEqualTo(1);
        JsonNode first = server.requests().get(0);
        JsonNode retry = server.requests().get(1);
        assertThat(retry.at("/systemInstruction/parts/0/text").asString())
                .isEqualTo(first.at("/systemInstruction/parts/0/text").asString());
        assertThat(retry.at("/generationConfig").toString())
                .isEqualTo(first.at("/generationConfig").toString());
        assertThat(retry.at("/contents/0/parts/0/text").asString()).contains("JSON");
    }

    private static Path matrixPath() {
        for (Path path : List.of(Path.of("docs/rag-spike/results/production-e2e-matrix.json"),
                Path.of("../docs/rag-spike/results/production-e2e-matrix.json"))) {
            if (Files.isRegularFile(path)) return path;
        }
        throw new IllegalStateException("Prepared 30-case production E2E matrix is missing");
    }

    @TestConfiguration
    static class TestWiring {
        @Bean LocalGeminiServer localGeminiServer() { return GEMINI; }

        @Bean @Primary RecordingModerationClient recordingModerationClient() {
            return new RecordingModerationClient();
        }
        @Bean @Primary
        ChatModel localGeminiChatModel() {
            return GoogleAiGeminiChatModel.builder().apiKey("integration-test-only")
                    .modelName("gemini-3.5-flash-lite").baseUrl(GEMINI.baseUrl())
                    .supportedCapabilities(Capability.RESPONSE_FORMAT_JSON_SCHEMA).maxRetries(0).build();
        }

        @Bean @Primary
        CurriculumRAGService integrationRag(JsonMapper mapper) throws Exception {
            List<CurriculumDataset> datasets = CurriculumDataset.loadAllReviewed();
            var store = new InMemoryEmbeddingStore<TextSegment>();
            for (CurriculumDataset dataset : datasets) {
                for (var chunk : dataset.chunks()) {
                    store.add(topicEmbedding(chunk.topic()), chunk.toSegment(dataset.source(), "gemini-embedding-001"));
                }
            }
            EmbeddingModel deterministicModel = new EmbeddingModel() {
                @Override public dev.langchain4j.model.output.Response<List<Embedding>> embedAll(List<TextSegment> segments) {
                    return dev.langchain4j.model.output.Response.from(segments.stream()
                            .map(segment -> topicEmbedding(segment.metadata().getString("topic"))).toList());
                }
                @Override public dev.langchain4j.model.output.Response<Embedding> embed(String text) {
                    return dev.langchain4j.model.output.Response.from(topicEmbedding(text));
                }
            };
            return new CurriculumRAGService(store, deterministicModel,
                    new CurriculumDatasetCatalog(datasets), "gemini-embedding-001", RagSpikeConfig.TOP_K, 0.855);
        }

        @Bean @Primary
        RecordingCurriculumContextProvider integrationCurriculum(CurriculumRAGService rag) {
            return new RecordingCurriculumContextProvider(rag);
        }

        @Bean @Primary
        GameGenerationService integrationGeneration(ObjectProvider<GameContentGenerator> generator,
                GameContentStrategyRegistry strategies, AiOutputValidator aiValidator,
                com.aigameplatform.backend.service.factory.GameDslFactoryRegistry factories,
                GameValidationService validation, JsonMapper mapper,
                ObjectProvider<CurriculumContextProvider> curriculum,
                ObjectProvider<CurriculumEvidenceReviewer> reviewer,
                @org.springframework.beans.factory.annotation.Value("${app.generation.max-retries:2}") int maxRetries) {
            return new GameGenerationService(generator, strategies, aiValidator, factories, validation, mapper,
                    curriculum, reviewer, true, maxRetries);
        }

        private static Embedding topicEmbedding(String topic) {
            try {
                byte[] hash = MessageDigest.getInstance("SHA-256").digest(topic.getBytes(StandardCharsets.UTF_8));
                float[] vector = new float[4096];
                for (int i = 0; i < 3; i++) {
                    int slot = Math.floorMod(((hash[i * 4] & 0xff) << 24) | ((hash[i * 4 + 1] & 0xff) << 16)
                            | ((hash[i * 4 + 2] & 0xff) << 8) | (hash[i * 4 + 3] & 0xff), vector.length);
                    vector[slot] = 1;
                }
                return Embedding.from(vector);
            } catch (Exception exception) {
                throw new IllegalStateException("Could not build deterministic test embedding", exception);
            }
        }
    }

    static final class RecordingModerationClient implements ContentModerationClient {
        private final AtomicInteger count = new AtomicInteger();
        @Override public boolean isConfigured() { return true; }
        @Override public List<ModerationResult> moderate(List<String> texts) {
            count.incrementAndGet();
            return texts.stream().map(text -> new ModerationResult(false, List.of())).toList();
        }
        int calls() { return count.get(); }
        void reset() { count.set(0); }
    }

    static final class RecordingCurriculumContextProvider implements CurriculumContextProvider {
        private final CurriculumRAGService rag;
        private final AtomicInteger count = new AtomicInteger();
        private final AtomicReference<CurriculumRAGService.RetrievalResult> last = new AtomicReference<>();

        RecordingCurriculumContextProvider(CurriculumRAGService rag) { this.rag = rag; }

        @Override public Evidence retrieve(String topic, Subject subject, GradeLevel grade) {
            count.incrementAndGet();
            var result = rag.retrieve(topic, subject, grade);
            last.set(result);
            return switch (result.status()) {
                case FOUND -> Evidence.found(result.curriculumContext());
                case INSUFFICIENT_EVIDENCE -> Evidence.insufficient();
                case UNSUPPORTED_SCOPE -> Evidence.unsupported();
            };
        }

        int calls() { return count.get(); }
        CurriculumRAGService.RetrievalResult lastResult() { return last.get(); }
        void reset() { count.set(0); last.set(null); }
    }

    static final class LocalGeminiServer {
        private final HttpServer server;
        private final JsonMapper mapper = JsonMapper.builder().build();
        private final AtomicReference<GameType> activeType;
        private final AtomicInteger requestCount = new AtomicInteger();
        private final AtomicBoolean invalidOnce = new AtomicBoolean();
        private final List<JsonNode> requests = new CopyOnWriteArrayList<>();

        private LocalGeminiServer(AtomicReference<GameType> activeType) throws IOException {
            this.activeType = activeType;
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/v1beta/models/", exchange -> {
                byte[] body = exchange.getRequestBody().readAllBytes();
                requests.add(mapper.readTree(body));
                requestCount.incrementAndGet();
                String output = invalidOnce.compareAndSet(true, false) ? "{\"questions\":[]}"
                        : GameTestFixtures.resource("/ai-output-examples/", activeType.get());
                byte[] response = mapper.writeValueAsBytes(Map.of("candidates", List.of(Map.of("content",
                        Map.of("role", "model", "parts", List.of(Map.of("text", output))),
                        "finishReason", "STOP")),
                        "usageMetadata", Map.of("promptTokenCount", 1, "candidatesTokenCount", 1,
                                "totalTokenCount", 2)));
                exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
                exchange.sendResponseHeaders(200, response.length);
                try (var stream = exchange.getResponseBody()) { stream.write(response); }
            });
            server.start();
        }

        static LocalGeminiServer start() {
            try { return new LocalGeminiServer(new AtomicReference<>(GameType.QUIZ)); }
            catch (IOException exception) { throw new ExceptionInInitializerError(exception); }
        }
        String baseUrl() { return "http://127.0.0.1:" + server.getAddress().getPort() + "/v1beta"; }
        int requestCount() { return requestCount.get(); }
        List<JsonNode> requests() { return List.copyOf(requests); }
        void returnInvalidOutputOnce() { invalidOnce.set(true); }
        void setGameType(GameType gameType) { activeType.set(gameType); }
        void reset() { requestCount.set(0); requests.clear(); invalidOnce.set(false); }
        void stop() { server.stop(0); }
    }
}
