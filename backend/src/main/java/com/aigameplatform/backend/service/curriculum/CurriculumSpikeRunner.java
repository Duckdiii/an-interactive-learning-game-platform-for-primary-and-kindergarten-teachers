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
        if (args.length == 0) throw new IllegalArgumentException("Specify --check-config, --extract, --migrate, --ingest, --query or --evaluate");
        String mode = args[0];
        if (!java.util.Set.of("--check-config", "--extract", "--migrate", "--ingest", "--query", "--evaluate").contains(mode))
            throw new IllegalArgumentException("Unknown RAG mode");
        var config = RagSpikeConfig.from(environment);
        var mapper = new JsonMapper();
        if ("--check-config".equals(mode)) {
            System.out.println(mapper.writeValueAsString(config.safeStatus()));
            return config.safeStatus().values().stream().allMatch(Boolean::booleanValue) ? 0 : 2;
        }
        var dataset = CurriculumDataset.loadDefault();
        if ("--extract".equals(mode) || "--ingest".equals(mode)) {
            String path = args.length > 1 ? args[1] : config.pdfPath();
            if (path.isBlank()) throw new IllegalArgumentException("Set CURRICULUM_PDF or supply a PDF path");
            var verification = new CurriculumPdfExtractor().verifyAndExtract(Path.of(path), dataset,
                    Path.of("target", "curriculum-spike", "extracted"));
            System.out.println(mapper.writeValueAsString(verification));
            if ("--extract".equals(mode)) return 0;
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
                var existing = CurriculumSpikeDatabase.knownIds(database, dataset.source(), config.embeddingModel());
                var expected = dataset.chunks().stream()
                        .map(c -> c.embeddingId(dataset.source(), config.embeddingModel(), RagSpikeConfig.DIMENSION))
                        .collect(java.util.stream.Collectors.toSet());
                if (!expected.containsAll(existing))
                    throw new IllegalStateException("Unexpected rows under this dataset version; re-audit/version the corpus");
                var model = embedding(config, GoogleAiEmbeddingModel.TaskType.RETRIEVAL_DOCUMENT);
                var result = new CurriculumIngestor(store, model, config.embeddingModel(), RagSpikeConfig.DIMENSION)
                        .ingest(dataset, existing);
                CurriculumSpikeDatabase.requireCompleteDataset(database, dataset, config.embeddingModel());
                System.out.println(mapper.writeValueAsString(result));
                return 0;
            }
            CurriculumSpikeDatabase.requireCompleteDataset(database, dataset, config.embeddingModel());
            var queryModel = embedding(config, GoogleAiEmbeddingModel.TaskType.RETRIEVAL_QUERY);
            var service = new CurriculumRAGService(store, queryModel, dataset.source(), config.embeddingModel(),
                    RagSpikeConfig.TOP_K, config.minScore());
            if ("--evaluate".equals(mode) && args.length > 1 && !"legacy".equals(args[1])) {
                if (args.length < 3 || !java.util.Set.of("tune", "holdout").contains(args[1]))
                    throw new IllegalArgumentException("--evaluate tune|holdout QUERIES_PATH [TUNE_PATH]");
                var constraints = CurriculumConstraints.load(dataset);
                constraints.requireApproved(environment.getOrDefault("CURRICULUM_CONSTRAINTS_APPROVED_SHA256", ""));
                var queries = CurriculumBenchmark.loadReviewed(Path.of(args[2]), dataset, constraints);
                CurriculumBenchmark.requireCohorts(queries, args[1]);
                if ("holdout".equals(args[1])) {
                    if (args.length < 4) throw new IllegalArgumentException("Holdout needs a reviewed tune set for overlap checks");
                    var tune = CurriculumBenchmark.loadReviewed(Path.of(args[3]), dataset, constraints);
                    CurriculumBenchmark.requireCohorts(tune, "tune");
                    CurriculumBenchmark.requireDisjoint(tune, queries);
                }
                var measurements = CurriculumBenchmark.evaluate(service, dataset, constraints, queries);
                var metrics = CurriculumBenchmark.summarize(measurements);
                var report = new LinkedHashMap<String, Object>(Map.of("reportVersion", 3, "evaluationSet", args[1], "dataset", dataset.source(),
                        "constraintsSha256", constraints.sha256(), "embeddingModel", config.embeddingModel(),
                        "minScore", config.minScore(), "measuredAtUtc", Instant.now().toString(),
                        "manualGameReview", "PENDING", "summary", metrics, "queries", measurements));
                report.put("cohorts", CurriculumBenchmark.summarizeCohorts(measurements));
                Path reportPath = Path.of("..", "docs", "rag-spike", "results", "benchmark-" + args[1] + "-"
                        + Instant.now().toString().replace(':', '-') + ".json");
                Files.createDirectories(reportPath.getParent());
                Files.writeString(reportPath, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(report), StandardCharsets.UTF_8);
                System.out.println(mapper.writeValueAsString(metrics));
                return metrics.qualityGatePassed() ? 0 : 4;
            }
            if ("--query".equals(mode)) {
                if (args.length < 4) throw new IllegalArgumentException("--query SUBJECT GRADE_LEVEL TOPIC");
                Subject subject = Subject.valueOf(args[1]);
                GradeLevel grade = GradeLevel.valueOf(args[2]);
                var result = service.retrieve(String.join(" ", Arrays.copyOfRange(args, 3, args.length)), subject, grade);
                System.out.println(mapper.writeValueAsString(result));
                return result.status() == CurriculumRAGService.Status.FOUND ? 0 : 3;
            }
            var queries = CurriculumEvaluation.loadQueries();
            var rows = CurriculumEvaluation.evaluate(service, queries);
            var summary = CurriculumEvaluation.summarize(rows);
            var probes = new ArrayList<CurriculumEvaluation.ControlProbe>();
            var controlIds = dataset.chunks().stream().filter(CurriculumChunk::control)
                    .map(CurriculumChunk::chunkId).collect(java.util.stream.Collectors.toSet());
            for (var control : dataset.chunks().stream().filter(CurriculumChunk::control).toList()) {
                var own = service.retrieve(control.text(), control.subject(), control.gradeLevel());
                var primary = service.retrieve(control.text(), Subject.MATH, GradeLevel.GRADE_1);
                probes.add(CurriculumEvaluation.scoreControl(control, controlIds, own, primary));
            }
            boolean controlsPass = !probes.isEmpty() && probes.stream().allMatch(CurriculumEvaluation.ControlProbe::passed);
            var report = new LinkedHashMap<String, Object>();
            report.put("measurementStatus", "LIVE_COMPLETED");
            report.put("reportVersion", 2);
            report.put("evaluationScope", "LEGACY_RETRIEVAL_ONLY_NOT_VERIFIED_GENERATION");
            report.put("controlPolicy", "STORED_BUT_EXCLUDED_FROM_ALL_RETRIEVAL_SCOPES");
            report.put("measuredAtUtc", Instant.now().toString());
            report.put("dataset", dataset.source());
            report.put("embeddingModel", config.embeddingModel());
            report.put("embeddingDimension", RagSpikeConfig.DIMENSION);
            report.put("topK", RagSpikeConfig.TOP_K);
            report.put("minScore", config.minScore());
            report.put("manualReview", "PENDING: inspect returned text and source pages before citing quality conclusions");
            report.put("summary", summary);
            report.put("controlProbes", probes);
            report.put("controlsStored", true);
            report.put("controlsPassed", controlsPass);
            report.put("passed", summary.passed() && controlsPass);
            report.put("queries", rows);
            Path output = Path.of("..", "docs", "rag-spike", "results",
                    "live-" + Instant.now().toString().replace(':', '-') + ".json");
            Files.createDirectories(output.getParent());
            Files.writeString(output, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(report), StandardCharsets.UTF_8);
            System.out.println("Live report: " + output.toAbsolutePath().normalize());
            System.out.println(mapper.writeValueAsString(summary));
            return summary.passed() && controlsPass ? 0 : 4;
        }
    }

    private static GoogleAiEmbeddingModel embedding(RagSpikeConfig config, GoogleAiEmbeddingModel.TaskType task) {
        return GoogleAiEmbeddingModel.builder().apiKey(config.apiKey()).modelName(config.embeddingModel())
                .taskType(task).outputDimensionality(RagSpikeConfig.DIMENSION).maxRetries(2)
                .timeout(Duration.ofSeconds(30)).logRequestsAndResponses(false).build();
    }
}
