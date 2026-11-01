package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.exception.*;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.googleai.*;
import dev.langchain4j.store.embedding.EmbeddingStore;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import tools.jackson.databind.json.JsonMapper;

/** Local-only evaluation through the production provider, not the obsolete Math-only spike decision path. */
public final class CurriculumRuntimeEvaluation {
    private static final JsonMapper JSON = new JsonMapper();
    private CurriculumRuntimeEvaluation() { }
    public record Outcome(CurriculumBenchmark.Query query, String status, List<String> selectedIds,
                          List<CurriculumRAGService.RetrievedChunk> ranked, long elapsedMillis, long retrievalMillis, long verificationMillis) { }

    public static List<CurriculumBenchmark.Query> loadDraft(Path path, CurriculumDataset dataset, String split)
            throws Exception {
        return loadQueries(path, dataset, split, false);
    }

    static List<CurriculumBenchmark.Query> loadQueries(Path path, CurriculumDataset dataset, String split,
            boolean reviewed) throws Exception {
        byte[] bytes = Files.readAllBytes(path);
        var manifest = JSON.readTree(Files.readString(Path.of(path + ".manifest.json")));
        String sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        if (!sha.equals(manifest.path("querySha256").asString())
                || !dataset.source().sourceSha256().equals(manifest.path("sourceSha256").asString())
                || !dataset.source().datasetVersion().equals(manifest.path("datasetVersion").asString())
                || !dataset.source().curriculumVersion().equals(manifest.path("curriculumVersion").asString())
                || !(reviewed ? "APPROVED" : "AI_AUTHORED_UNREVIEWED").equals(manifest.path("reviewStatus").asString()))
            throw new IllegalArgumentException("Exploratory manifest/source/checksum mismatch");
        if (reviewed && (manifest.path("reviewedBy").asString().isBlank()
                || manifest.path("reviewedAt").asString().isBlank() || !split.equals(manifest.path("split").asString())))
            throw new IllegalArgumentException("Independent reviewer, date and split are required");
        if (reviewed && dataset.chunks().getFirst().subject() == Subject.MATH
                && dataset.chunks().getFirst().gradeLevel() == GradeLevel.GRADE_1
                && !CurriculumConstraints.load(dataset).sha256().equals(manifest.path("constraintsSha256").asString()))
            throw new IllegalArgumentException("Reviewed arithmetic constraints checksum mismatch");
        var queries = new String(bytes, java.nio.charset.StandardCharsets.UTF_8).lines().filter(s -> !s.isBlank())
                .map(line -> JSON.readValue(line, CurriculumBenchmark.Query.class)).toList();
        var primary = dataset.chunks().stream().filter(c -> !c.control()).collect(
                java.util.stream.Collectors.toMap(CurriculumChunk::chunkId, java.util.function.Function.identity()));
        if (queries.stream().map(CurriculumBenchmark.Query::queryId).distinct().count() != queries.size())
            throw new IllegalArgumentException("Duplicate evaluation query IDs");
        for (var q : queries) {
            if (!split.equals(q.split()) || (reviewed ? q.writerId().isBlank() || q.labelerIds().isEmpty() || q.labelerIds().contains(q.writerId())
                            : !q.labelerIds().isEmpty() || !"AI_CODEX".equals(q.writerId()))
                    || !primary.keySet().containsAll(q.expectedChunkIds())
                    || dataset.chunks().stream().noneMatch(c -> !c.control() && c.gradeLevel() == q.gradeLevel()
                            && (q.gradeLevel() == GradeLevel.KINDERGARTEN || c.subject() == q.subject())))
                throw new IllegalArgumentException("Invalid exploratory query scope or label provenance");
            for (var id : q.expectedChunkIds()) {
                var chunk = primary.get(id);
                if (chunk.gradeLevel() != q.gradeLevel() || (q.gradeLevel() != GradeLevel.KINDERGARTEN
                        && chunk.subject() != q.subject()) || !Objects.equals(q.ageBand(), chunk.ageBand()))
                    throw new IllegalArgumentException("Expected outcome belongs to a different scope/age");
            }
            if (q.gradeLevel() == GradeLevel.KINDERGARTEN) KindergartenAgeBand.valueOf(q.ageBand());
        }
        CurriculumBenchmark.requireCohorts(queries, split.equals("DEV") ? "tune" : "holdout");
        return queries;
    }

    static List<Outcome> evaluate(CurriculumDataset dataset, List<CurriculumBenchmark.Query> queries,
            EmbeddingStore<TextSegment> store, EmbeddingModel embedding, String embeddingModel,
            SemanticCurriculumEvidenceVerifier semantic, CurriculumAvailability availability, String approvedSha) {
        var rows = new ArrayList<Outcome>();
        for (var q : queries) {
            var ranked = new AtomicReference<List<CurriculumRAGService.RetrievedChunk>>(List.of());
            var completedRetrieval = new java.util.concurrent.atomic.AtomicLong();
            var retriever = new CurriculumRAGService(store, embedding, dataset.source(), embeddingModel, 3, .855,
                    result -> { ranked.set(result.chunks().isEmpty() ? result.suggestions() : result.chunks());
                        completedRetrieval.set(System.nanoTime()); });
            var provider = new VerifiedCurriculumContextProvider(
                    new CurriculumCatalog(List.of(dataset), Set.of(GameType.QUIZ)), availability, () -> retriever,
                    () -> { try { return CurriculumConstraints.load(dataset); }
                            catch (java.io.IOException ex) { throw new IllegalStateException(ex); } },
                    approvedSha, CurriculumMetrics.noop(), embeddingModel, 8, .50, () -> null, () -> semantic);
            long started = System.nanoTime();
            String status;
            List<String> ids = List.of();
            try {
                var evidence = provider.retrieve(q.topic(), q.subject(), q.gradeLevel(), q.ageBand() == null
                        ? null : KindergartenAgeBand.valueOf(q.ageBand()));
                status = "SUPPORTED";
                ids = evidence.evidence().chunks().stream().map(CurriculumRAGService.RetrievedChunk::chunkId).toList();
            } catch (CurriculumClarificationRequiredException | KindergartenAgeBandRequiredException ex) {
                status = "NEEDS_CLARIFICATION";
            } catch (CurriculumEvidenceNotFoundException ex) { status = "INSUFFICIENT_EVIDENCE";
            } catch (CurriculumServiceUnavailableException ex) { status = "SERVICE_UNAVAILABLE"; }
            long finished = System.nanoTime();
            long retrievalEnd = completedRetrieval.get() == 0 ? started : completedRetrieval.get();
            rows.add(new Outcome(q, status, ids, ranked.get(), (finished - started) / 1_000_000,
                    (retrievalEnd - started) / 1_000_000, (finished - retrievalEnd) / 1_000_000));
        }
        return List.copyOf(rows);
    }

    static Map<String, Object> summarize(List<Outcome> outcomes, CurriculumDataset dataset) {
        var expected = dataset.chunks().stream().filter(c -> !c.control()).map(CurriculumChunk::chunkId)
                .collect(java.util.stream.Collectors.toSet());
        var rows = outcomes.stream().filter(o -> !o.status().equals("SERVICE_UNAVAILABLE")).map(o -> {
            var q = o.query();
            int leaks = (int) o.ranked().stream().filter(c -> !expected.contains(c.chunkId())
                    || c.gradeLevel() != q.gradeLevel()
                    || (q.gradeLevel() == GradeLevel.KINDERGARTEN ? !q.ageBand().equals(c.ageBand())
                            : c.subject() != q.subject())).count();
            boolean hit = o.ranked().stream().limit(3).anyMatch(c -> q.expectedChunkIds().contains(c.chunkId()));
            double rr = 0;
            for (int i = 0; i < o.ranked().size(); i++) if (q.expectedChunkIds().contains(o.ranked().get(i).chunkId())) {
                rr = 1.0 / (i + 1); break;
            }
            boolean accepted = o.status().equals("SUPPORTED");
            return new CurriculumBenchmark.Row(q, hit, accepted, leaks, o.retrievalMillis(), o.verificationMillis(),
                    accepted && !o.selectedIds().isEmpty() && q.expectedChunkIds().containsAll(o.selectedIds()),
                    !accepted && hit, rr);
        }).toList();
        long unavailable = outcomes.stream().filter(o -> o.status().equals("SERVICE_UNAVAILABLE")).count();
        var result = new LinkedHashMap<String, Object>();
        result.put("labelReview", "AI_AUTHORED_UNREVIEWED");
        result.put("releaseGate", "NOT_ESTABLISHED");
        result.put("serviceUnavailable", unavailable);
        result.put("measuredQueries", rows.size());
        result.put("configuredGateUnchanged", "Hit@3 >= .90; supported acceptance >= .90; false accept = 0; scope leak = 0");
        result.put("exploratoryMetrics", rows.isEmpty() ? null : CurriculumBenchmark.summarize(rows));
        result.put("latencyDefinition", "Retrieval includes readiness, query embedding and ranked fetch; verification is the remaining provider time. Service failures excluded from decision metrics and counted separately.");
        result.put("measurementComplete", unavailable == 0);
        return result;
    }

    public static void main(String[] args) throws Exception {
        if (args.length != 4 || !(args[0].equals("--preflight") || args[0].equals("--exploratory") || args[0].equals("--reviewed"))
                || !Set.of("DEV", "HOLDOUT_CANDIDATE", "HOLDOUT").contains(args[2]))
            throw new IllegalArgumentException("--preflight|--exploratory|--reviewed QUERY_ROOT DEV|HOLDOUT_CANDIDATE|HOLDOUT OUTPUT.json");
        boolean reviewed = args[0].equals("--reviewed");
        if (reviewed && args[2].equals("HOLDOUT_CANDIDATE"))
            throw new IllegalArgumentException("Exposed candidates cannot establish independent holdout");
        var environment = System.getenv();
        var config = RagSpikeConfig.from(environment);
        var report = new LinkedHashMap<String, Object>();
        report.put("measuredAt", Instant.now().toString());
        report.put("mode", args[0]);
        report.put("environment", config.safeStatus());
        report.put("releaseGate", "NOT_ESTABLISHED");
        report.put("labelReview", reviewed ? "REVIEW_MANIFEST_VALIDATED" : "AI_AUTHORED_UNREVIEWED");
        report.put("codeRevision", environment.getOrDefault("GIT_COMMIT", "UNKNOWN"));
        var all = CurriculumDataset.loadPackaged();
        var queries = new LinkedHashMap<CurriculumDataset, List<CurriculumBenchmark.Query>>();
        for (var d : all) {
            var path = Path.of(args[1], d.source().datasetVersion(), args[2] + ".jsonl");
            var set = loadQueries(path, d, args[2], reviewed);
            if (reviewed && args[2].equals("HOLDOUT"))
                CurriculumBenchmark.requireDisjoint(loadQueries(path.getParent().resolve("DEV.jsonl"), d, "DEV", true), set);
            queries.put(d, set);
        }
        var results = new LinkedHashMap<String, Object>();
        if (args[0].equals("--preflight")) {
            queries.forEach((d, q) -> results.put(d.source().datasetVersion(), Map.of("queries", q.size(),
                    "source", d.source(), "liveEvaluation", "NOT_RUN")));
        } else {
          try {
            if (!config.localEvaluation()) throw new IllegalArgumentException("Exploratory runtime evaluation is local-only; set RAG_LOCAL_EVAL=true");
            config.requireDatabase(); config.requireEmbedding();
            try (var db = CurriculumSpikeDatabase.connect(config)) {
                CurriculumSpikeDatabase.requireLocalEvaluationTarget(db, Path.of("target/rag-eval-local/data"));
                var model = GoogleAiEmbeddingModel.builder().apiKey(config.apiKey()).modelName(config.embeddingModel())
                        .taskType(GoogleAiEmbeddingModel.TaskType.RETRIEVAL_QUERY).outputDimensionality(768)
                        .timeout(Duration.ofSeconds(30)).maxRetries(0).logRequestsAndResponses(false).build();
                String name = environment.getOrDefault("GEMINI_MODEL", "gemini-2.5-flash");
                var judge = new GeminiSemanticCurriculumEvidenceVerifier(GoogleAiGeminiChatModel.builder()
                        .apiKey(config.apiKey()).modelName(name).timeout(Duration.ofSeconds(30)).maxRetries(0)
                        .logRequestsAndResponses(false).supportedCapabilities(Set.of(
                                dev.langchain4j.model.chat.Capability.RESPONSE_FORMAT_JSON_SCHEMA)).build(), JSON, name);
                var readiness = new CurriculumAvailability(Clock.systemUTC(), Duration.ofSeconds(30),
                        d -> {
                            if (reviewed && d.chunks().getFirst().gradeLevel() == GradeLevel.KINDERGARTEN
                                    && !d.source().sourceSha256().equals(environment.get("CURRICULUM_KINDERGARTEN_EXPERT_APPROVED_SOURCE_SHA256")))
                                throw new IllegalStateException("Exact preschool source specialist approval is required");
                            new CurriculumDatasetReadiness(db).requireComplete(d, config.embeddingModel());
                        });
                for (var entry : queries.entrySet()) {
                    var outcomes = evaluate(entry.getKey(), entry.getValue(), CurriculumSpikeDatabase.store(db), model,
                            config.embeddingModel(), judge, readiness,
                            environment.getOrDefault("CURRICULUM_CONSTRAINTS_APPROVED_SHA256", ""));
                    // Exploratory KG evaluation deliberately does not publish or bypass runtime expert approval.
                    var summary = summarize(outcomes, entry.getKey());
                    if (reviewed) summary.put("labelReview", "REVIEW_MANIFEST_VALIDATED");
                    results.put(entry.getKey().source().datasetVersion(), Map.of(
                            "summary", summary, "outcomes", outcomes));
                }
            }
          } catch (Exception unavailable) {
            report.put("execution", "BLOCKED_ENVIRONMENT_OR_SERVICE");
            report.put("failureType", unavailable.getClass().getSimpleName());
            for (var d : all) results.putIfAbsent(d.source().datasetVersion(), Map.of(
                    "liveEvaluation", "NOT_RUN", "reason", "LOCAL_DATABASE_OR_MODEL_UNAVAILABLE"));
          }
        }
        report.put("scopes", results);
        Path output = Path.of(args[3]);
        if (output.toAbsolutePath().getParent() != null) Files.createDirectories(output.toAbsolutePath().getParent());
        Files.writeString(output, JSON.writerWithDefaultPrettyPrinter().writeValueAsString(report));
        if (report.containsKey("failureType"))
            throw new IllegalStateException("Local runtime evaluation blocked; see sanitized report");
    }
}
