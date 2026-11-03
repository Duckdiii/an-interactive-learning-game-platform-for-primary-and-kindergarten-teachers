package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.exception.*;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.exception.HttpException;
import dev.langchain4j.exception.RateLimitException;
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
                          List<CurriculumRAGService.RetrievedChunk> ranked, long elapsedMillis, long retrievalMillis,
                          long verificationMillis, String serviceFailureCategory, String failureStage) {
        public Outcome(CurriculumBenchmark.Query query, String status, List<String> selectedIds,
                List<CurriculumRAGService.RetrievedChunk> ranked, long elapsedMillis, long retrievalMillis,
                long verificationMillis) {
            this(query, status, selectedIds, ranked, elapsedMillis, retrievalMillis, verificationMillis, null, null);
        }
    }

    public static List<CurriculumBenchmark.Query> loadDraft(Path path, CurriculumDataset dataset, String split)
            throws Exception {
        return loadQueries(path, dataset, split, false);
    }

    static List<CurriculumBenchmark.Query> loadQueries(Path path, CurriculumDataset dataset, String split,
            boolean reviewed) throws Exception {
        String content = Files.readString(path, java.nio.charset.StandardCharsets.UTF_8)
                .replace("\r\n", "\n").replace('\r', '\n');
        byte[] bytes = content.getBytes(java.nio.charset.StandardCharsets.UTF_8);
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
        var queries = content.lines().filter(s -> !s.isBlank())
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
        return evaluate(dataset, queries, store, embedding, embeddingModel, semantic, availability, approvedSha,
                ignored -> { }, false);
    }

    static List<Outcome> evaluate(CurriculumDataset dataset, List<CurriculumBenchmark.Query> queries,
            EmbeddingStore<TextSegment> store, EmbeddingModel embedding, String embeddingModel,
            SemanticCurriculumEvidenceVerifier semantic, CurriculumAvailability availability, String approvedSha,
            java.util.function.Consumer<Outcome> onOutcome, boolean stopOnQuota) {
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
            String failureCategory = null;
            String failureStage = null;
            List<String> ids = List.of();
            try {
                var evidence = provider.retrieve(q.topic(), q.subject(), q.gradeLevel(), q.ageBand() == null
                        ? null : KindergartenAgeBand.valueOf(q.ageBand()));
                status = "SUPPORTED";
                ids = evidence.evidence().chunks().stream().map(CurriculumRAGService.RetrievedChunk::chunkId).toList();
            } catch (CurriculumClarificationRequiredException | KindergartenAgeBandRequiredException ex) {
                status = "NEEDS_CLARIFICATION";
            } catch (CurriculumEvidenceNotFoundException ex) { status = "INSUFFICIENT_EVIDENCE";
            } catch (CurriculumServiceUnavailableException ex) {
                status = "SERVICE_UNAVAILABLE";
                failureCategory = classifyServiceFailure(ex);
                failureStage = completedRetrieval.get() == 0 ? "BEFORE_RANKING" : "AFTER_RANKING";
            }
            long finished = System.nanoTime();
            long retrievalEnd = completedRetrieval.get() == 0 ? started : completedRetrieval.get();
            var outcome = new Outcome(q, status, ids, ranked.get(), (finished - started) / 1_000_000,
                    (retrievalEnd - started) / 1_000_000, (finished - retrievalEnd) / 1_000_000,
                    failureCategory, failureStage);
            rows.add(outcome);
            onOutcome.accept(outcome);
            if (stopOnQuota && "QUOTA".equals(failureCategory))
                throw new CurriculumEvaluationQuotaExhaustedException();
        }
        return List.copyOf(rows);
    }

    static String classifyServiceFailure(Throwable exception) {
        boolean hasCause = false;
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            hasCause = true;
            if (cause instanceof RateLimitException) return "QUOTA";
            if (cause instanceof HttpException http) {
                if (http.statusCode() == 429) return "QUOTA";
                if (http.statusCode() == 401) return "AUTHENTICATION";
                if (http.statusCode() == 403) return "PERMISSION";
                return "HTTP_" + http.statusCode();
            }
            if (cause instanceof java.sql.SQLException) return "DATABASE";
            if (cause instanceof java.net.UnknownHostException) return "DNS";
            if (cause instanceof java.net.SocketTimeoutException || cause instanceof java.util.concurrent.TimeoutException)
                return "TIMEOUT";
        }
        if (!hasCause || exception.getCause() == null) return "CAUSE_NOT_RETAINED";
        String simpleName = exception.getCause().getClass().getSimpleName().replaceAll("[^A-Za-z0-9]", "");
        return simpleName.isBlank() ? "OTHER" : "OTHER_" + simpleName;
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
        if ((args.length < 4 || args.length > 6)
                || !(args[0].equals("--preflight") || args[0].equals("--exploratory") || args[0].equals("--reviewed"))
                || !Set.of("DEV", "HOLDOUT_CANDIDATE", "HOLDOUT").contains(args[2]))
            throw new IllegalArgumentException("--preflight|--exploratory|--reviewed QUERY_ROOT DEV|HOLDOUT_CANDIDATE|HOLDOUT RUN_ROOT [RUN_ID] [DATASET_VERSION]");
        boolean reviewed = args[0].equals("--reviewed");
        if (reviewed && args[2].equals("HOLDOUT_CANDIDATE"))
            throw new IllegalArgumentException("Exposed candidates cannot establish independent holdout");
        var environment = System.getenv();
        var config = RagSpikeConfig.from(environment);
        Instant startedAt = Instant.now();
        var run = CurriculumEvaluationRunStore.begin(Path.of(args[3]), args.length >= 5 ? args[4] : null, startedAt);
        System.out.println("RAG_EVAL_RUN_ID=" + run.runId());
        System.out.println("RAG_EVAL_ATTEMPT_ID=" + run.attemptId());
        var report = new LinkedHashMap<String, Object>();
        report.put("measuredAt", startedAt.toString());
        report.put("mode", args[0]);
        report.put("runId", run.runId());
        report.put("attemptId", run.attemptId());
        report.put("runReport", "attempts/" + run.attemptId() + "/report.json");
        report.put("environment", config.safeStatus());
        report.put("releaseGate", "NOT_ESTABLISHED");
        report.put("labelReview", reviewed ? "REVIEW_MANIFEST_VALIDATED" : "AI_AUTHORED_UNREVIEWED");
        report.put("codeRevision", environment.getOrDefault("GIT_COMMIT", "UNKNOWN"));
        String datasetFilter = args.length == 6 ? args[5] : null;
        var all = selectDatasets(CurriculumDataset.loadPackaged(), datasetFilter);
        report.put("scopeSelection", datasetFilter == null || datasetFilter.isBlank() ? "ALL_DATASETS" : datasetFilter);
        var queries = new LinkedHashMap<CurriculumDataset, List<CurriculumBenchmark.Query>>();
        try {
            for (var d : all) {
                var path = Path.of(args[1], d.source().datasetVersion(), args[2] + ".jsonl");
                var set = loadQueries(path, d, args[2], reviewed);
                if (reviewed && args[2].equals("HOLDOUT"))
                    CurriculumBenchmark.requireDisjoint(loadQueries(path.getParent().resolve("DEV.jsonl"), d, "DEV", true), set);
                queries.put(d, set);
            }
        } catch (Exception inputFailure) {
            report.put("execution", "BLOCKED_INPUT_PREFLIGHT");
            report.put("failureType", inputFailure.getClass().getSimpleName());
            report.put("scopes", Map.of());
            run.writeReport(JSON.writerWithDefaultPrettyPrinter().writeValueAsString(report));
            throw new IllegalStateException("Evaluation input preflight failed; see this attempt's report");
        }
        var results = new LinkedHashMap<String, Object>();
        boolean interruptedByQuota = false;
        long cacheFreshVectors = 0;
        long cacheReusedVectors = 0;
        long cacheLiveApiCalls = 0;
        long queryCount = queries.values().stream().mapToLong(List::size).sum();
        long pendingQueryEstimate = queryCount;
        if (!args[0].equals("--preflight")) {
            try {
                pendingQueryEstimate = pendingQueryEstimate(run, queries, args[0], args[2],
                        config.embeddingModel(), environment.getOrDefault("GEMINI_MODEL", "gemini-2.5-flash"));
            } catch (Exception checkpointProblem) {
                report.put("execution", "BLOCKED_CHECKPOINT_OR_FINGERPRINT");
                report.put("failureType", checkpointProblem.getClass().getSimpleName());
                all.forEach(d -> results.put(d.source().datasetVersion(), Map.of("liveEvaluation", "NOT_RUN_CHECKPOINT_PREFLIGHT")));
            }
        }
        var requestEstimate = CurriculumEvaluationQuotaPlan.estimate(pendingQueryEstimate);
        report.put("totalManifestQueries", queryCount);
        report.put("estimatedPendingQueries", pendingQueryEstimate);
        var quotaCheck = CurriculumEvaluationQuotaPlan.check(environment, requestEstimate, startedAt);
        report.put("requestBudget", quotaCheck.asMap(requestEstimate));
        if (report.containsKey("failureType")) {
            // Checkpoint drift is a hard stop; never reinterpret it as a fresh full evaluation.
        } else if (args[0].equals("--preflight")) {
            queries.forEach((d, q) -> results.put(d.source().datasetVersion(), Map.of("queries", q.size(),
                    "source", d.source(), "liveEvaluation", "NOT_RUN_PREFLIGHT_ONLY")));
            report.put("execution", "PREFLIGHT_ONLY_NO_PROVIDER_CALLS");
        } else if (!quotaCheck.confirmed()) {
            queries.forEach((d, q) -> results.put(d.source().datasetVersion(), Map.of("queries", q.size(),
                    "liveEvaluation", "NOT_RUN_QUOTA_BUDGET_UNCONFIRMED")));
            report.put("execution", "BLOCKED_QUOTA_PRECHECK");
            report.put("failureType", "QuotaBudgetNotConfirmed");
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
                    var dataset = entry.getKey();
                    var datasetVersion = dataset.source().datasetVersion();
                    boolean syntheticCacheAllowed = args[0].equals("--exploratory")
                            && entry.getValue().stream().allMatch(q -> "AI_CODEX".equals(q.writerId())
                                    && q.labelerIds().isEmpty());
                    String fingerprint = checkpointFingerprint(dataset, entry.getValue(), args[0], args[2],
                            config.embeddingModel(), name);
                    Path checkpointPath = run.runDirectory().resolve("checkpoints").resolve(datasetVersion + ".jsonl");
                    Path cachePath = run.runDirectory().resolve("query-embedding-cache").resolve(datasetVersion + ".jsonl");
                    try (var checkpoint = CurriculumRuntimeCheckpoint.open(checkpointPath, fingerprint);
                         var queryCache = syntheticCacheAllowed
                                 ? new BenchmarkQueryEmbeddingCache(model,
                                         cachePath,
                                         config.embeddingModel(), datasetVersion, fingerprint, 768)
                                 : null) {
                        EmbeddingModel queryModel = queryCache == null ? model : queryCache;
                        var pendingIds = checkpoint.pendingQueryIds(entry.getValue().stream()
                                .map(CurriculumBenchmark.Query::queryId).toList());
                        var pendingSet = Set.copyOf(pendingIds);
                        var pendingQueries = entry.getValue().stream()
                                .filter(q -> pendingSet.contains(q.queryId())).toList();
                        try {
                            evaluate(dataset, pendingQueries, CurriculumSpikeDatabase.store(db), queryModel,
                                    config.embeddingModel(), judge, readiness,
                                    environment.getOrDefault("CURRICULUM_CONSTRAINTS_APPROVED_SHA256", ""),
                                    outcome -> {
                                        try { checkpoint.record(outcome); }
                                        catch (java.io.IOException io) { throw new java.io.UncheckedIOException(io); }
                                    }, true);
                        } catch (CurriculumEvaluationQuotaExhaustedException quota) {
                            interruptedByQuota = true;
                        }
                        var outcomes = entry.getValue().stream().map(CurriculumBenchmark.Query::queryId)
                                .map(id -> checkpoint.latestOutcomes().stream()
                                        .filter(outcome -> outcome.query().queryId().equals(id)).findFirst().orElse(null))
                                .filter(Objects::nonNull).toList();
                        var summary = summarize(outcomes, dataset);
                        if (reviewed) summary.put("labelReview", "REVIEW_MANIFEST_VALIDATED");
                        summary.put("pendingQueries", checkpoint.pendingQueryIds(entry.getValue().stream()
                                .map(CurriculumBenchmark.Query::queryId).toList()).size());
                        var stats = queryCache == null ? new BenchmarkQueryEmbeddingCache.Stats(0, 0, 0)
                                : queryCache.stats();
                        cacheFreshVectors += stats.freshVectors();
                        cacheReusedVectors += stats.reusedVectors();
                        cacheLiveApiCalls += stats.liveApiCalls();
                        results.put(datasetVersion, Map.of("summary", summary, "outcomes", outcomes,
                                "checkpoint", checkpointPath.getFileName().toString(),
                                "queryEmbeddingCache", Map.of("mode", syntheticCacheAllowed
                                        ? "PERSISTENT_SYNTHETIC_EXPLORATORY_ONLY" : "DISABLED",
                                        "freshVectorsThisRun", stats.freshVectors(),
                                        "reusedVectorsThisRun", stats.reusedVectors(),
                                        "liveApiCallsThisRun", stats.liveApiCalls())));
                    }
                    if (interruptedByQuota) break;
                }
            }
          } catch (CurriculumEvaluationQuotaExhaustedException quota) {
            interruptedByQuota = true;
          } catch (Exception unavailable) {
            report.put("execution", "BLOCKED_ENVIRONMENT_OR_SERVICE");
            report.put("failureType", unavailable.getClass().getSimpleName());
            for (var d : all) results.putIfAbsent(d.source().datasetVersion(), Map.of(
                    "liveEvaluation", "NOT_RUN", "reason", "LOCAL_DATABASE_OR_MODEL_UNAVAILABLE"));
          }
        }
        if (!report.containsKey("execution")) {
            String execution = report.containsKey("failureType") ? "BLOCKED_ENVIRONMENT_OR_SERVICE"
                    : interruptedByQuota ? "STOPPED_ON_CONFIRMED_QUOTA_PENDING_RESUME" : "COMPLETED_OR_PARTIAL";
            report.put("execution", execution);
        }
        if (interruptedByQuota) for (var dataset : all) {
            String version = dataset.source().datasetVersion();
            if (!results.containsKey(version)) results.put(version, Map.of("liveEvaluation", "NOT_RUN_STOPPED_ON_QUOTA",
                    "pendingQueries", queries.get(dataset).size()));
        }
        report.put("queryEmbeddingCachePolicy", Map.of("persistentCache", "Synthetic AI_CODEX exploratory datasets only",
                "teacherRequests", "No persistent query embedding cache", "freshVectorsThisRun", cacheFreshVectors,
                "reusedVectorsThisRun", cacheReusedVectors, "liveApiCallsThisRun", cacheLiveApiCalls));
        report.put("scopes", results);
        run.writeReport(JSON.writerWithDefaultPrettyPrinter().writeValueAsString(report));
        if (report.containsKey("failureType"))
            throw new IllegalStateException("Evaluation blocked; see this attempt's report");
        if (interruptedByQuota)
            throw new IllegalStateException("Evaluation stopped after confirmed provider quota exhaustion; resume this run ID");
    }

    static List<CurriculumDataset> selectDatasets(List<CurriculumDataset> available, String datasetVersion) {
        if (datasetVersion == null || datasetVersion.isBlank()) return List.copyOf(available);
        var selected = available.stream().filter(d -> datasetVersion.equals(d.source().datasetVersion())).toList();
        if (selected.isEmpty()) throw new IllegalArgumentException("Unknown curriculum dataset version: " + datasetVersion);
        return selected;
    }
    private static String checkpointFingerprint(CurriculumDataset dataset,
            List<CurriculumBenchmark.Query> queries, String mode, String split, String embeddingModel,
            String reviewerModel) throws Exception {
        var settings = new LinkedHashMap<String, Object>();
        settings.put("protocol", "runtime-eval-checkpoint-v1"); settings.put("mode", mode); settings.put("split", split);
        settings.put("datasetVersion", dataset.source().datasetVersion());
        settings.put("curriculumVersion", dataset.source().curriculumVersion());
        settings.put("sourceSha256", dataset.source().sourceSha256()); settings.put("embeddingModel", embeddingModel);
        settings.put("reviewerModel", reviewerModel); settings.put("topK", 3);
        settings.put("similarityThreshold", 0.855); settings.put("semanticMinConfidence", 0.50);
        settings.put("queryManifest", queries);
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(JSON.writeValueAsBytes(settings)));
    }

    private static long pendingQueryEstimate(CurriculumEvaluationRunStore.Run run,
            Map<CurriculumDataset, List<CurriculumBenchmark.Query>> queries, String mode, String split,
            String embeddingModel, String reviewerModel) throws Exception {
        long pending = 0;
        for (var entry : queries.entrySet()) {
            var dataset = entry.getKey();
            Path checkpointPath = run.runDirectory().resolve("checkpoints")
                    .resolve(dataset.source().datasetVersion() + ".jsonl");
            if (!Files.isRegularFile(checkpointPath)) {
                pending += entry.getValue().size();
                continue;
            }
            String fingerprint = checkpointFingerprint(dataset, entry.getValue(), mode, split, embeddingModel, reviewerModel);
            try (var checkpoint = CurriculumRuntimeCheckpoint.open(checkpointPath, fingerprint)) {
                pending += checkpoint.pendingQueryIds(entry.getValue().stream()
                        .map(CurriculumBenchmark.Query::queryId).toList()).size();
            }
        }
        return pending;
    }
}
