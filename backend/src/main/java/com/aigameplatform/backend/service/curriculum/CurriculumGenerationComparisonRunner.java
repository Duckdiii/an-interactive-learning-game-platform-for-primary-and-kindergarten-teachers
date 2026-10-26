package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
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
import com.aigameplatform.backend.service.validation.ai.AiOutputValidator;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.request.ChatRequestParameters;
import dev.langchain4j.model.chat.request.ResponseFormat;
import dev.langchain4j.model.chat.request.ResponseFormatType;
import dev.langchain4j.model.chat.request.json.JsonRawSchema;
import dev.langchain4j.model.chat.request.json.JsonSchema;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.googleai.GoogleAiEmbeddingModel;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import tools.jackson.databind.json.JsonMapper;

/** One-shot matched Gemini comparison for the selected primary subject and grade. */
public final class CurriculumGenerationComparisonRunner {
    private CurriculumGenerationComparisonRunner() { }

    static CurriculumDataset loadDataset(Subject subject, GradeLevel grade) throws java.io.IOException {
        return new CurriculumDatasetCatalog(CurriculumDataset.loadAllReviewed()).select(subject, grade).getFirst();
    }

    public static void main(String[] args) {
        System.setOut(new PrintStream(System.out, true, StandardCharsets.UTF_8));
        String stage = "argument validation";
        boolean allTypes = args.length > 0 && "--compare-all-generation".equals(args[0]);
        if (args.length == 0 || !(allTypes || "--compare-generation".equals(args[0]))
                || args.length < (allTypes ? 4 : 5)) {
            System.err.println("Use --compare-generation SUBJECT GRADE GAME_TYPE TOPIC... or --compare-all-generation SUBJECT GRADE TOPIC...");
            System.exit(2);
        }
        try {
            stage = "configuration validation";
            var config = RagSpikeConfig.from(System.getenv());
            config.requireDatabase();
            config.requireEmbedding();
            String chatModelName = System.getenv("GEMINI_MODEL");
            if (chatModelName == null || chatModelName.isBlank()) throw new IllegalStateException("GEMINI_MODEL is required");
            Subject subject = Subject.valueOf(args[1]);
            GradeLevel grade = GradeLevel.valueOf(args[2]);
            GameType gameType = allTypes ? null : GameType.valueOf(args[3]);
            int topicStart = allTypes ? 3 : 4;
            String topic;
            if (args.length == topicStart + 2 && "--query-id".equals(args[topicStart])) {
                String queryId = args[topicStart + 1];
                topic = CurriculumEvaluation.loadQueries(subject, grade).stream().filter(q -> q.queryId().equals(queryId))
                        .findFirst().orElseThrow(() -> new IllegalArgumentException("Unknown UTF-8 benchmark query ID"))
                        .topic();
            } else {
                topic = String.join(" ", Arrays.copyOfRange(args, topicStart, args.length));
            }
            var dataset = loadDataset(subject, grade);
            var catalog = new CurriculumDatasetCatalog(List.of(dataset));
            var jsonMapper = new JsonMapper();
            var strategies = new GameContentStrategyRegistry(List.of(
                    new QuizGameStrategy(jsonMapper), new AudioVisualMatchGameStrategy(jsonMapper),
                    new OddOneOutGameStrategy(jsonMapper), new SpotTheTargetGameStrategy(jsonMapper),
                    new WordScrambleGameStrategy(jsonMapper), new MatchingGameStrategy(jsonMapper),
                    new MemoryCardGameStrategy(jsonMapper), new DragDropGameStrategy(jsonMapper),
                    new OrderingGameStrategy(jsonMapper), new VisualClozeGameStrategy(jsonMapper)));
            ChatModel chatModel = GoogleAiGeminiChatModel.builder().apiKey(config.apiKey())
                    .modelName(chatModelName).supportedCapabilities(Set.of(
                            dev.langchain4j.model.chat.Capability.RESPONSE_FORMAT_JSON_SCHEMA)).maxRetries(0).build();
            EmbeddingModel queryDelegate = GoogleAiEmbeddingModel.builder().apiKey(config.apiKey())
                    .modelName(config.embeddingModel()).taskType(GoogleAiEmbeddingModel.TaskType.RETRIEVAL_QUERY)
                    .outputDimensionality(RagSpikeConfig.DIMENSION).maxRetries(2).timeout(Duration.ofSeconds(30))
                    .logRequestsAndResponses(false).build();
            var queryModel = new QueryEmbeddingCacheEmbeddingModel(queryDelegate, config.embeddingModel(),
                    RagSpikeConfig.DIMENSION, GoogleAiEmbeddingModel.TaskType.RETRIEVAL_QUERY.name(),
                    Path.of("target", "curriculum-spike", "query-embedding-cache.jsonl"));

            try (var database = CurriculumSpikeDatabase.connect(config)) {
                stage = "indexed corpus verification";
                CurriculumSpikeDatabase.requireCompleteDataset(database, dataset, config.embeddingModel());
                var rag = new CurriculumRAGService(CurriculumSpikeDatabase.store(database), queryModel, catalog,
                        config.embeddingModel(), config.topK(), config.minScore());
                Path outputDir = Path.of("..", "docs", "rag-spike", "results", "generation-comparison");
                List<GameType> gameTypes = allTypes ? Arrays.asList(GameType.values()) : List.of(gameType);
                var batch = new LinkedHashMap<String, Object>();
                for (GameType current : gameTypes) {
                    stage = "retrieval and paired Gemini generation for " + current;
                    try {
                        var artifact = run(chatModel, chatModelName, strategies.get(current), new AiOutputValidator(jsonMapper),
                                rag, dataset, subject, grade, current, topic, config.minScore(), outputDir, jsonMapper);
                        batch.put(current.name(), Map.of("status", artifact.get("status"),
                                "withRagSchemaValid", ((Map<?, ?>) artifact.get("withRag")).get("schemaValid"),
                                "withoutRagSchemaValid", ((Map<?, ?>) artifact.get("withoutRag")).get("schemaValid"),
                                "answerCorrectness", "NOT_REVIEWED", "curriculumAlignment", "NOT_REVIEWED"));
                        System.out.println("Generation comparison status=" + artifact.get("status") + ", game=" + current
                                + ", scope=" + subject + "/" + grade + ", evidence=" + outputDir.toAbsolutePath().normalize());
                    } catch (RuntimeException failure) {
                        String safeReason = "UNCLASSIFIED_RUNTIME_FAILURE";
                        String phase = "UNKNOWN";
                        String causeClass = failure.getClass().getSimpleName();
                        List<String> safeFrames = List.of();
                        if (failure instanceof SafeComparisonFailure safe) {
                            phase = safe.phase;
                            causeClass = safe.causeClass;
                            safeFrames = safe.frames;
                        }
                        if (failure instanceof IllegalStateException
                                && "No curriculum evidence available for a matched generation comparison".equals(failure.getMessage())) {
                            safeReason = "RETRIEVAL_RETURNED_NO_EVIDENCE_AT_CONFIGURED_MIN_SCORE";
                        }
                        batch.put(current.name(), Map.of("status", "FAILED_OR_BLOCKED", "failureClass",
                                failure.getClass().getSimpleName(), "failureReason", safeReason, "phase", phase,
                                "rootCauseClass", causeClass, "safeStackFrames", safeFrames, "schemaValidity", "NOT_AVAILABLE",
                                "answerCorrectness", "NOT_REVIEWED", "curriculumAlignment", "NOT_REVIEWED"));
                        System.err.println("Generation comparison not completed for " + current + " ("
                                + safeReason + "); raw provider details omitted");
                    }
                }
                batch.put("queryEmbeddingCache", Map.of("hits", queryModel.cacheHits(),
                        "providerMisses", queryModel.providerMisses(),
                        "file", "backend/target/curriculum-spike/query-embedding-cache.jsonl"));
                batch.put("runAtUtc", Instant.now().toString());
                batch.put("pipelineVersion", "evidence-gate-v2");
                batch.put("scope", Map.of("subject", subject.name(), "gradeLevel", grade.name()));
                batch.put("topic", topic);
                batch.put("model", chatModelName);
                batch.put("retrievalMinScore", config.minScore());
                String id = Instant.now().toString().replace(':', '-');
                Files.writeString(outputDir.resolve("batch-" + id + ".json"),
                        jsonMapper.writerWithDefaultPrettyPrinter().writeValueAsString(batch), StandardCharsets.UTF_8);
                if (allTypes) {
                    long attempted = gameTypes.size();
                    long succeeded = gameTypes.stream().filter(type -> "PAIRED_OUTPUTS_CAPTURED_MANUAL_SCORING_REQUIRED"
                            .equals(((Map<?, ?>) batch.get(type.name())).get("status"))).count();
                    System.out.println("Batch summary: " + succeeded + "/" + attempted
                            + " game types produced matched artifacts; failed rows are recorded, not counted as passes.");
                } else {
                    System.out.println("Comparison checkpoint saved for " + gameType + "; status="
                            + ((Map<?, ?>) batch.get(gameType.name())).get("status") + "; cache hits="
                            + queryModel.cacheHits() + ", provider misses=" + queryModel.providerMisses());
                }
            }
        } catch (Exception exception) {
            System.err.println("Generation comparison failed during " + stage + " (" + exception.getClass().getSimpleName()
                    + "); secrets and provider response headers were not printed");
            System.exit(1);
        }
    }

    static Map<String, Object> run(ChatModel model, String modelName,
                                   com.aigameplatform.backend.service.strategy.GameContentStrategy<?, ?> strategy,
                                   AiOutputValidator validator, CurriculumRAGService retriever,
                                   CurriculumDataset dataset, Subject subject, GradeLevel grade,
                                   GameType gameType, String topic, double retrievalThreshold,
                                   Path outputDir, JsonMapper mapper) throws Exception {
        CurriculumRAGService.RetrievalResult retrieval;
        try {
            retrieval = retriever.retrieve(topic, subject, grade);
        } catch (RuntimeException exception) {
            throw SafeComparisonFailure.from("RETRIEVAL", exception);
        }
        if (retrieval.status() != CurriculumRAGService.Status.FOUND || retrieval.curriculumContext().isBlank()) {
            throw new SafeComparisonFailure("RETRIEVAL_NO_EVIDENCE", "NoEvidence", List.of());
        }
        String schema = strategy.getStructuredSchema();
        String userMessage = "Tạo nội dung game theo yêu cầu trong system prompt. Chỉ trả về JSON theo schema đã cung cấp.";
        String ragPrompt = strategy.buildPrompt(topic, subject, grade, retrieval.curriculumContext());
        String baselinePrompt = strategy.buildPrompt(topic, subject, grade);
        Map<String, Object> withRag;
        try { withRag = generate(model, validator, gameType, schema, ragPrompt, userMessage); }
        catch (RuntimeException exception) { throw SafeComparisonFailure.from("GEMINI_WITH_RAG", exception); }
        Map<String, Object> withoutRag;
        try { withoutRag = generate(model, validator, gameType, schema, baselinePrompt, userMessage); }
        catch (RuntimeException exception) { throw SafeComparisonFailure.from("GEMINI_WITHOUT_RAG", exception); }

        var artifact = new LinkedHashMap<String, Object>();
        artifact.put("runAtUtc", Instant.now().toString());
        artifact.put("status", "PAIRED_OUTPUTS_CAPTURED_MANUAL_SCORING_REQUIRED");
        artifact.put("scope", Map.of("subject", subject.name(), "gradeLevel", grade.name()));
        artifact.put("gameType", gameType.name());
        artifact.put("topic", topic);
        artifact.put("model", modelName);
        artifact.put("comparisonControls", "Same model, topic, subject, grade, game strategy, user request and schema; only curriculum context differs");
        artifact.put("curriculumSource", dataset.source());
        artifact.put("retrievalStatus", retrieval.status().name());
        artifact.put("retrievalMinScore", retrievalThreshold);
        artifact.put("retrievedChunks", retrieval.chunks());
        artifact.put("withRag", withRag);
        artifact.put("withoutRag", withoutRag);
        artifact.put("manualScoring", Map.of("status", "NOT_REVIEWED", "reviewer", "NOT_ASSIGNED",
                "criteria", List.of("answer correctness", "source grounding", "curriculum limits", "grade fit", "schema validity", "playability")));
        artifact.put("interpretationLimit", "One topic and one scope only; outputs are not a general estimate of RAG quality");

        Files.createDirectories(outputDir);
        String runId = Instant.now().toString().replace(':', '-');
        Files.writeString(outputDir.resolve("pair-" + runId + ".json"),
                mapper.writerWithDefaultPrettyPrinter().writeValueAsString(artifact), StandardCharsets.UTF_8);
        String csv = "variant,model,subject,gradeLevel,gameType,topic,retrievalStatus,chunkIds,valid,latencyMillis,rawOutput\n"
                + csvRow("WITH_RAG", modelName, subject, grade, gameType, topic, retrieval.status().name(),
                retrieval.chunks().stream().map(CurriculumRAGService.RetrievedChunk::chunkId).toList(), withRag)
                + "\n" + csvRow("WITHOUT_RAG", modelName, subject, grade, gameType, topic, "NOT_USED",
                List.of(), withoutRag) + "\n";
        Files.writeString(outputDir.resolve("pair-" + runId + ".csv"), csv, StandardCharsets.UTF_8);
        return Map.copyOf(artifact);
    }

    private static Map<String, Object> generate(ChatModel model, AiOutputValidator validator, GameType type,
                                                 String schema, String systemPrompt, String userPrompt) {
        ResponseFormat format = ResponseFormat.builder().type(ResponseFormatType.JSON)
                .jsonSchema(JsonSchema.builder().rootElement(JsonRawSchema.builder().schema(schema).build())
                        .build()).build();
        long start = System.nanoTime();
        var response = model.chat(ChatRequest.builder().messages(SystemMessage.from(systemPrompt), UserMessage.from(userPrompt))
                .parameters(ChatRequestParameters.builder().responseFormat(format).build()).build());
        String raw = response == null || response.aiMessage() == null ? "" : response.aiMessage().text();
        var validation = validator.validate(type, raw);
        return Map.of("systemPrompt", systemPrompt, "rawOutput", raw, "schemaValid", validation.valid(),
                "validationErrors", validation.errors(), "latencyMillis", (System.nanoTime() - start) / 1_000_000);
    }

    private static String csvRow(String variant, String model, Subject subject, GradeLevel grade, GameType type,
                                 String topic, String retrievalStatus, List<String> chunkIds, Map<String, Object> result) {
        return String.join(",", List.of(csv(variant), csv(model), csv(subject.name()), csv(grade.name()), csv(type.name()),
                csv(topic), csv(retrievalStatus), csv(String.join(";", chunkIds)), csv(result.get("schemaValid").toString()),
                csv(result.get("latencyMillis").toString()), csv(result.get("rawOutput").toString())));
    }

    private static String csv(String value) { return "\"" + value.replace("\"", "\"\"") + "\""; }

    private static final class SafeComparisonFailure extends RuntimeException {
        private final String phase;
        private final String causeClass;
        private final List<String> frames;
        private SafeComparisonFailure(String phase, String causeClass, List<String> frames) {
            super("Safe generation comparison failure");
            this.phase = phase;
            this.causeClass = causeClass;
            this.frames = List.copyOf(frames);
        }
        private static SafeComparisonFailure from(String phase, RuntimeException exception) {
            List<String> frames = java.util.Arrays.stream(exception.getStackTrace()).limit(6)
                    .map(frame -> frame.getClassName() + "." + frame.getMethodName()).toList();
            return new SafeComparisonFailure(phase, exception.getClass().getSimpleName(), frames);
        }
    }
}
