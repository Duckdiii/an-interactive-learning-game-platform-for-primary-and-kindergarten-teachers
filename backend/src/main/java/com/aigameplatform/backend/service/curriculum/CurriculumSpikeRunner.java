package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import dev.langchain4j.model.googleai.GoogleAiEmbeddingModel;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import org.flywaydb.core.Flyway;
import tools.jackson.databind.json.JsonMapper;

/** Standalone setup/measurement job; it does not start Spring, JWT or game generation. */
public final class CurriculumSpikeRunner {
    private CurriculumSpikeRunner() { }

    public static void main(String[] args) {
        System.setOut(new PrintStream(System.out, true, StandardCharsets.UTF_8));
        int exitCode;
        try {
            exitCode = run(args, System.getenv());
        } catch (Exception exception) {
            // Provider/SQL exception messages can contain credentials or request headers.
            System.err.println("RAG operation failed (" + exception.getClass().getSimpleName()
                    + "). Check configuration, source-verification and the setup guide; secrets were not printed.");
            exitCode = 1;
        }
        if (exitCode != 0) System.exit(exitCode);
    }

    static int run(String[] args, Map<String, String> environment) throws Exception {
        if (args.length == 0) throw new IllegalArgumentException("Specify --check-config, --extract, --migrate, --ingest, --query, --evaluate or --evaluate-holdout");
        String mode = args[0];
        if (!java.util.Set.of("--check-config", "--extract", "--migrate", "--ingest", "--query", "--evaluate", "--evaluate-holdout", "--evaluate-holdout-v2").contains(mode))
            throw new IllegalArgumentException("Unknown RAG mode");
        boolean evaluationMode = "--evaluate".equals(mode) || mode.startsWith("--evaluate-holdout");
        if (evaluationMode && args.length != 1 && args.length != 3 && args.length != 4)
            throw new IllegalArgumentException("Evaluation accepts all scopes or SUBJECT GRADE_LEVEL [HOLDOUT_VERSION]");
        if ("--evaluate-holdout-v2".equals(mode) && args.length != 3)
            throw new IllegalArgumentException("Holdout v2 requires SUBJECT GRADE_LEVEL; it replaces holdout v1 only for previously exposed scopes");
        var config = RagSpikeConfig.from(environment);
        var mapper = new JsonMapper();
        if ("--check-config".equals(mode)) {
            System.out.println(mapper.writeValueAsString(config.safeStatus()));
            return config.safeStatus().values().stream().allMatch(Boolean::booleanValue) ? 0 : 2;
        }
        var datasets = CurriculumDataset.loadAllReviewed();
        var catalog = new CurriculumDatasetCatalog(datasets);
        var evaluationDatasets = args.length >= 3 && evaluationMode
                ? catalog.select(Subject.valueOf(args[1]), GradeLevel.valueOf(args[2])) : datasets;
        var grade1Math = catalog.find(Subject.MATH, GradeLevel.GRADE_1)
                .orElseThrow(() -> new IllegalStateException("The Math Grade 1 exploratory dataset is required"));
        if ("--extract".equals(mode) || "--ingest".equals(mode)) {
            String path = args.length > 1 ? args[1] : config.pdfPath();
            if (path.isBlank()) throw new IllegalArgumentException("Set CURRICULUM_PDF or supply a PDF path");
            var results = new ArrayList<Map<String, Object>>();
            for (var dataset : datasets) {
                var verification = new CurriculumPdfExtractor().verifyAndExtract(Path.of(path), dataset,
                        Path.of("target", "curriculum-spike", "extracted", dataset.source().datasetVersion()));
                if ("--ingest".equals(mode) && verification.verifiedChunks() != dataset.chunks().size()) {
                    throw new IllegalStateException("Source verification is incomplete; review text transcriptions before ingestion");
                }
                results.add(Map.of("scope", dataset.chunks().stream().filter(c -> !c.control()).findFirst()
                                .map(c -> c.subject() + "/" + c.gradeLevel()).orElse("UNKNOWN"),
                        "verification", verification));
            }
            if ("--extract".equals(mode)) {
                System.out.println(mapper.writeValueAsString(results));
                return 0;
            }
        }
        if (!"--migrate".equals(mode)) config.requireEmbedding();
        try (var database = CurriculumSpikeDatabase.connect(config)) {
            if ("--migrate".equals(mode)) {
                Flyway.configure().dataSource(database).locations("classpath:db/migration")
                        .baselineOnMigrate(true).baselineVersion("0").load().migrate();
                System.out.println("Flyway migrations applied; the embedding table is managed by V5.");
                return 0;
            }
            var store = CurriculumSpikeDatabase.store(database);
            if ("--ingest".equals(mode)) {
                var model = embedding(config, GoogleAiEmbeddingModel.TaskType.RETRIEVAL_DOCUMENT);
                var ingestor = new CurriculumIngestor(store, model, config.embeddingModel(), RagSpikeConfig.DIMENSION);
                var results = new ArrayList<Map<String, Object>>();
                for (var dataset : datasets) {
                    var existing = CurriculumSpikeDatabase.knownIds(database, dataset.source(), config.embeddingModel());
                    var expected = dataset.chunks().stream()
                            .map(c -> c.embeddingId(dataset.source(), config.embeddingModel(), RagSpikeConfig.DIMENSION))
                            .collect(java.util.stream.Collectors.toSet());
                    if (!expected.containsAll(existing))
                        throw new IllegalStateException("Unexpected rows under this dataset version; re-audit/version the corpus");
                    var result = ingestor.ingest(dataset, existing);
                    CurriculumSpikeDatabase.requireCompleteDataset(database, dataset, config.embeddingModel());
                    results.add(Map.of("datasetVersion", dataset.source().datasetVersion(), "result", result));
                }
                System.out.println(mapper.writeValueAsString(results));
                return 0;
            }
            for (var dataset : evaluationDatasets) {
                CurriculumSpikeDatabase.requireCompleteDataset(database, dataset, config.embeddingModel());
            }
            var queryDelegate = embedding(config, GoogleAiEmbeddingModel.TaskType.RETRIEVAL_QUERY);
            var queryModel = new QueryEmbeddingCacheEmbeddingModel(queryDelegate, config.embeddingModel(),
                    RagSpikeConfig.DIMENSION, GoogleAiEmbeddingModel.TaskType.RETRIEVAL_QUERY.name(),
                    Path.of("target", "curriculum-spike", "query-embedding-cache.jsonl"));
            var service = new CurriculumRAGService(store, queryModel, catalog, config.embeddingModel(),
                    config.topK(), config.minScore());
            if (mode.startsWith("--evaluate-holdout")) {
                String holdoutVersion = "--evaluate-holdout-v2".equals(mode) ? "v2"
                        : args.length == 4 ? args[3] : "v1";
                boolean allScopesPassed = true;
                var summaries = new ArrayList<Map<String, Object>>();
                for (var dataset : evaluationDatasets) {
                    var primary = dataset.chunks().stream().filter(c -> !c.control()).findFirst().orElseThrow();
                    var queries = CurriculumHoldout.load(dataset, holdoutVersion);
                    long cacheHitsBefore = queryModel.cacheHits();
                    long providerMissesBefore = queryModel.providerMisses();
                    var rows = CurriculumHoldout.evaluate(service, queries, primary.subject(), primary.gradeLevel());
                    var summary = CurriculumHoldout.summarize(rows);
                    String scope = primary.subject().name().toLowerCase() + "-g" + primary.gradeLevel().name().substring(6);
                    var runId = scope + "-holdout-" + holdoutVersion + "-" + Instant.now().toString().replace(':', '-');
                    var run = new CurriculumHoldout.Run(runId, "FRESH_HOLDOUT_" + holdoutVersion.toUpperCase(), Instant.now(), primary.subject(),
                            primary.gradeLevel(), config.embeddingModel(), RagSpikeConfig.DIMENSION, config.topK(),
                            config.minScore(), dataset.source().sourceSha256(),
                            sha256Resource(CurriculumDataset.resourceRootFor(primary.subject(), primary.gradeLevel()), "holdout-" + holdoutVersion + ".jsonl"),
                            queryModel.cacheHits() - cacheHitsBefore, queryModel.providerMisses() - providerMissesBefore,
                            summary, rows);
                    Path output = Path.of("..", "docs", "rag-spike", "results", "holdout", runId + ".json");
                    Files.createDirectories(output.getParent());
                    Files.writeString(output, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(run), StandardCharsets.UTF_8);
                    Path csvOutput = output.resolveSibling(runId + ".csv");
                    Files.writeString(csvOutput, holdoutCsv(rows), StandardCharsets.UTF_8);
                    summaries.add(Map.of("subject", primary.subject(), "gradeLevel", primary.gradeLevel(),
                            "report", output.toString(), "summary", summary));
                    allScopesPassed &= summary.passed();
                }
                System.out.println(mapper.writeValueAsString(summaries));
                return allScopesPassed ? 0 : 4;
            }
            if ("--query".equals(mode)) {
                if (args.length < 4) throw new IllegalArgumentException("--query SUBJECT GRADE_LEVEL TOPIC");
                Subject subject = Subject.valueOf(args[1]);
                GradeLevel grade = GradeLevel.valueOf(args[2]);
                String topic = String.join(" ", Arrays.copyOfRange(args, 3, args.length));
                long start = System.nanoTime();
                var result = service.retrieve(topic, subject, grade);
                var probe = new LinkedHashMap<String, Object>();
                probe.put("measuredAtUtc", Instant.now().toString());
                probe.put("measurementStatus", "LIVE_SINGLE_QUERY");
                probe.put("subject", subject.name());
                probe.put("gradeLevel", grade.name());
                probe.put("topic", topic);
                probe.put("embeddingModel", config.embeddingModel());
                probe.put("embeddingDimension", RagSpikeConfig.DIMENSION);
                probe.put("topK", config.topK());
                probe.put("minScore", config.minScore());
                probe.put("queryEmbeddingCacheHits", queryModel.cacheHits());
                probe.put("queryEmbeddingProviderMisses", queryModel.providerMisses());
                probe.put("latencyMillis", (System.nanoTime() - start) / 1_000_000);
                probe.put("dataset", catalog.find(subject, grade).orElseThrow().source());
                probe.put("result", result);
                Path output = Path.of("..", "docs", "rag-spike", "results", "query-probes",
                        "probe-" + Instant.now().toString().replace(':', '-') + ".json");
                Files.createDirectories(output.getParent());
                Files.writeString(output, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(probe), StandardCharsets.UTF_8);
                System.out.println("Query probe: " + output.toAbsolutePath().normalize());
                System.out.println(mapper.writeValueAsString(Map.of("status", result.status(),
                        "returnedChunks", result.chunks().size(), "minScore", config.minScore())));
                return result.status() == CurriculumRAGService.Status.FOUND ? 0 : 3;
            }
            var scopeReports = new ArrayList<Map<String, Object>>();
            boolean allScopesPassed = true;
            for (var dataset : evaluationDatasets) {
                var primaryChunk = dataset.chunks().stream().filter(c -> !c.control()).findFirst().orElseThrow();
                Subject subject = primaryChunk.subject();
                GradeLevel grade = primaryChunk.gradeLevel();
                var queries = CurriculumEvaluation.loadQueries(subject, grade);
                var rows = CurriculumEvaluation.evaluate(service, queries, subject, grade);
                var summary = CurriculumEvaluation.summarize(rows);
                var probes = new ArrayList<Map<String, Object>>();
                for (var control : dataset.chunks().stream().filter(CurriculumChunk::control).toList()) {
                    var primary = service.retrieve(control.text(), subject, grade);
                    probes.add(Map.of("controlChunkId", control.chunkId(), "controlExcludedFromPrimary",
                            primary.chunks().stream().noneMatch(c -> c.chunkId().equals(control.chunkId())),
                            "primaryScopeLeakage", primary.chunks().stream()
                                    .filter(c -> c.subject() != subject || c.gradeLevel() != grade).count(),
                            "primaryScopeChunkIds", primary.chunks().stream()
                                    .map(CurriculumRAGService.RetrievedChunk::chunkId).toList()));
                }
                boolean controlsPass = probes.stream().allMatch(p -> Boolean.TRUE.equals(p.get("controlExcludedFromPrimary"))
                        && ((Number) p.get("primaryScopeLeakage")).longValue() == 0);
                scopeReports.add(Map.of("subject", subject, "gradeLevel", grade, "dataset", dataset.source(),
                        "summary", summary, "controlProbes", probes,
                        "controlsStatus", probes.isEmpty() ? "NOT_CONFIGURED" : controlsPass ? "PASS" : "FAIL",
                        "queries", rows));
                allScopesPassed &= summary.passed() && (probes.isEmpty() || controlsPass);
            }
            var report = new LinkedHashMap<String, Object>();
            report.put("measurementStatus", "LIVE_COMPLETED");
            report.put("measuredAtUtc", Instant.now().toString());
            report.put("embeddingModel", config.embeddingModel());
            report.put("embeddingDimension", RagSpikeConfig.DIMENSION);
            report.put("topK", config.topK());
            report.put("minScore", config.minScore());
            report.put("queryEmbeddingCacheHits", queryModel.cacheHits());
            report.put("queryEmbeddingProviderMisses", queryModel.providerMisses());
            report.put("queryEmbeddingCacheFile", "backend/target/curriculum-spike/query-embedding-cache.jsonl");
            report.put("manualReview", "PENDING: inspect returned text and source pages before citing quality conclusions");
            report.put("scopeCount", scopeReports.size());
            report.put("scopeResults", scopeReports);
            report.put("passed", allScopesPassed);
            Path output = Path.of("..", "docs", "rag-spike", "results",
                    "live-" + Instant.now().toString().replace(':', '-') + ".json");
            Files.createDirectories(output.getParent());
            Files.writeString(output, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(report), StandardCharsets.UTF_8);
            System.out.println("Live report: " + output.toAbsolutePath().normalize());
            System.out.println(mapper.writeValueAsString(scopeReports.stream().map(scope -> Map.of(
                    "subject", scope.get("subject"), "gradeLevel", scope.get("gradeLevel"),
                    "summary", scope.get("summary"), "controlsStatus", scope.get("controlsStatus"))).toList()));
            return allScopesPassed ? 0 : 4;
        }
    }

    private static GoogleAiEmbeddingModel embedding(RagSpikeConfig config, GoogleAiEmbeddingModel.TaskType task) {
        return GoogleAiEmbeddingModel.builder().apiKey(config.apiKey()).modelName(config.embeddingModel())
                .taskType(task).outputDimensionality(RagSpikeConfig.DIMENSION).maxRetries(2)
                .timeout(Duration.ofSeconds(30)).logRequestsAndResponses(false).build();
    }

    private static String sha256Resource(String name) throws Exception {
        return sha256Resource(CurriculumDataset.RESOURCE_ROOT, name);
    }

    private static String sha256Resource(String resourceRoot, String name) throws Exception {
        try (var input = CurriculumDataset.class.getResourceAsStream(resourceRoot + name)) {
            if (input == null) throw new IllegalStateException("Missing benchmark fixture " + name);
            return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                    .digest(input.readAllBytes()));
        }
    }

    private static String holdoutCsv(java.util.List<CurriculumHoldout.Row> rows) {
        var csv = new StringBuilder("queryId,kind,topic,expectedChunkIds,sourceDocument,sourceSha256,sourcePdfPage,returnedChunkIdsAndScores,candidateChunkIdsAndScores,evidenceReason,evidenceSupports,hitAt3,rejected,falseRejection,falseAcceptance,leakedChunks,latencyMillis,goldRationale\n");
        for (var row : rows) {
            var q = row.query();
            String returned = row.returned().stream().map(c -> c.chunkId() + ":" + c.score())
                    .collect(java.util.stream.Collectors.joining(";"));
            String candidates = row.candidates().stream().map(c -> c.chunkId() + ":" + c.score())
                    .collect(java.util.stream.Collectors.joining(";"));
            String evidenceSupports = row.evidenceSupports().stream().map(s -> s.requestedCondition()
                            + " => [" + s.chunkId() + "] " + s.outcomeText())
                    .collect(java.util.stream.Collectors.joining(";"));
            boolean hitAt3 = row.hit();
            csv.append(csv(q.queryId())).append(',').append(csv(q.kind().name())).append(',')
                    .append(csv(q.topic())).append(',').append(csv(String.join(";", q.expectedChunkIds()))).append(',')
                    .append(csv(q.sourceDocument())).append(',').append(csv(q.sourceSha256())).append(',')
                    .append(q.sourcePdfPage()).append(',').append(csv(returned)).append(',').append(csv(candidates)).append(',')
                    .append(csv(row.reasonCode())).append(',').append(csv(evidenceSupports)).append(',')
                    .append(hitAt3).append(',').append(row.rejected()).append(',')
                    .append(row.falseRejection()).append(',')
                    .append(row.falseAcceptance()).append(',').append(row.leakedChunks()).append(',')
                    .append(row.latencyMillis()).append(',').append(csv(q.goldRationale())).append('\n');
        }
        return csv.toString();
    }

    private static String csv(String value) { return "\"" + value.replace("\"", "\"\"") + "\""; }
}
