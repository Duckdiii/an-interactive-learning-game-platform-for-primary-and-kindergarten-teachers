package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.KindergartenAgeBand;
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
    private static final java.util.Set<String> DATASETS = java.util.Set.of(
            "primary-math-g1", "kindergarten", "vietnamese-g1-draft", "vietnamese-g2-draft",
            "vietnamese-g3-draft", "vietnamese-g4-draft", "vietnamese-g5-draft", "math-g2-draft",
            "math-g3-draft", "math-g4-draft", "math-g5-draft", "english-g1-draft", "english-g2-draft",
            "english-g3-draft", "english-g4-draft", "english-g5-draft");

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
            if (exception instanceof CurriculumSpikeDatabase.LocalEvaluationTargetException)
                System.err.println(exception.getMessage());
            if (Arrays.asList(args).contains("--extract")) {
                System.err.println("Extraction detail: " + exception.getMessage());
            }
            exitCode = 1;
        }
        if (exitCode != 0) System.exit(exitCode);
    }

    static int run(String[] args, Map<String, String> environment) throws Exception {
        String datasetName = "primary-math-g1";
        var positional = new ArrayList<String>();
        for (int i = 0; i < args.length; i++) {
            if ("--dataset".equals(args[i])) {
                if (++i >= args.length) throw new IllegalArgumentException("--dataset needs a dataset name");
                datasetName = args[i];
            } else positional.add(args[i]);
        }
        if (positional.isEmpty()) throw new IllegalArgumentException("Specify --check-config, --extract, --migrate, --ingest, --query or --evaluate");
        String[] command = positional.toArray(String[]::new);
        String mode = command[0];
        if (!java.util.Set.of("--check-config", "--extract", "--migrate", "--ingest", "--query", "--evaluate").contains(mode))
            throw new IllegalArgumentException("Unknown RAG mode");
        if (!DATASETS.contains(datasetName))
            throw new IllegalArgumentException("Unknown curriculum dataset");
        var config = RagSpikeConfig.from(environment);
        var mapper = new JsonMapper();
        if ("--check-config".equals(mode)) {
            System.out.println(mapper.writeValueAsString(config.safeStatus()));
            return config.safeStatus().values().stream().allMatch(Boolean::booleanValue) ? 0 : 2;
        }
        boolean kindergarten = "kindergarten".equals(datasetName);
        boolean vietnameseDraft = "vietnamese-g1-draft".equals(datasetName);
        boolean vietnameseGradeThreeDraft = "vietnamese-g3-draft".equals(datasetName);
        boolean vietnameseGradeFourDraft = "vietnamese-g4-draft".equals(datasetName);
        boolean vietnameseGradeFiveDraft = "vietnamese-g5-draft".equals(datasetName);
        boolean mathGradeTwoDraft = "math-g2-draft".equals(datasetName);
        boolean mathGradeThreeDraft = "math-g3-draft".equals(datasetName);
        boolean mathGradeFourDraft = "math-g4-draft".equals(datasetName);
        boolean mathGradeFiveDraft = "math-g5-draft".equals(datasetName);
        boolean vietnameseGradeTwoDraft = "vietnamese-g2-draft".equals(datasetName);
        boolean englishGradeThreeDraft = "english-g3-draft".equals(datasetName);
        boolean englishGradeOneDraft = "english-g1-draft".equals(datasetName);
        boolean englishGradeTwoDraft = "english-g2-draft".equals(datasetName);
        boolean englishGradeFourDraft = "english-g4-draft".equals(datasetName);
        boolean englishGradeFiveDraft = "english-g5-draft".equals(datasetName);
        var dataset = switch (datasetName) {
            case "kindergarten" -> CurriculumDataset.loadKindergarten();
            case "vietnamese-g1-draft" -> CurriculumDataset.loadFromResourceRoot(
                    "/curriculum/spike/vietnamese-grade1/");
            case "vietnamese-g3-draft" -> CurriculumDataset.loadFromResourceRoot(
                    "/curriculum/spike/vietnamese-grade3/");
            case "vietnamese-g4-draft" -> CurriculumDataset.loadFromResourceRoot(
                    "/curriculum/spike/vietnamese-grade4/");
            case "vietnamese-g5-draft" -> CurriculumDataset.loadFromResourceRoot(
                    "/curriculum/spike/vietnamese-grade5/");
            case "math-g2-draft" -> CurriculumDataset.loadFromResourceRoot(
                    "/curriculum/spike/math-grade2/");
            case "math-g3-draft" -> CurriculumDataset.loadFromResourceRoot(
                    "/curriculum/spike/math-grade3/");
            case "math-g4-draft" -> CurriculumDataset.loadFromResourceRoot(
                    "/curriculum/spike/math-grade4/");
            case "math-g5-draft" -> CurriculumDataset.loadFromResourceRoot(
                    "/curriculum/spike/math-grade5/");
            case "vietnamese-g2-draft" -> CurriculumDataset.loadFromResourceRoot(
                    "/curriculum/spike/vietnamese-grade2/");
            case "english-g3-draft" -> CurriculumDataset.loadFromResourceRoot(
                    "/curriculum/spike/english-grade3/");
            case "english-g1-draft" -> CurriculumDataset.loadFromResourceRoot(
                    "/curriculum/spike/english-grade1/");
            case "english-g2-draft" -> CurriculumDataset.loadFromResourceRoot(
                    "/curriculum/spike/english-grade2/");
            case "english-g4-draft" -> CurriculumDataset.loadFromResourceRoot(
                    "/curriculum/spike/english-grade4/");
            case "english-g5-draft" -> CurriculumDataset.loadFromResourceRoot(
                    "/curriculum/spike/english-grade5/");
            default -> CurriculumDataset.loadDefault();
        };
        boolean draftDataset = vietnameseDraft || vietnameseGradeThreeDraft || vietnameseGradeFourDraft
                || vietnameseGradeFiveDraft || mathGradeTwoDraft || mathGradeThreeDraft || mathGradeFourDraft
                || mathGradeFiveDraft || vietnameseGradeTwoDraft || englishGradeOneDraft || englishGradeTwoDraft
                || englishGradeThreeDraft || englishGradeFourDraft || englishGradeFiveDraft;
        requireDraftEvaluationAllowed(draftDataset, mode, config);
        if ("--extract".equals(mode) || "--ingest".equals(mode)) {
            String defaultPreschoolPdf = "src/main/resources/curriculum/kindergarten/sources/01-VBHN-BGDĐT-2021.pdf";
            String path = command.length > 1 ? command[1]
                    : kindergarten ? defaultPreschoolPdf : config.pdfPath();
            if (path.isBlank()) throw new IllegalArgumentException("Set CURRICULUM_PDF or supply a PDF path");
            var verification = new CurriculumPdfExtractor().verifyAndExtract(Path.of(path), dataset,
                    extractionOutputPath(datasetName));
            System.out.println(mapper.writeValueAsString(verification));
            if ("--extract".equals(mode)) return 0;
        }
        if (!"--migrate".equals(mode)) config.requireEmbedding();
        try (var database = CurriculumSpikeDatabase.connect(config)) {
            if (config.localEvaluation())
                CurriculumSpikeDatabase.requireLocalEvaluationTarget(database, Path.of("target/rag-eval-local/data"));
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
            if ("--evaluate".equals(mode) && command.length > 1 && !"legacy".equals(command[1])) {
                if (command.length < 3 || !java.util.Set.of("tune", "holdout").contains(command[1]))
                    throw new IllegalArgumentException("--evaluate tune|holdout QUERIES_PATH [TUNE_PATH]");
                var constraints = kindergarten ? null : CurriculumConstraints.load(dataset);
                if (constraints != null) constraints.requireApproved(environment.getOrDefault("CURRICULUM_CONSTRAINTS_APPROVED_SHA256", ""));
                var queries = kindergarten
                        ? CurriculumBenchmark.loadReviewedKindergarten(Path.of(command[2]), dataset)
                        : CurriculumBenchmark.loadReviewed(Path.of(command[2]), dataset, constraints);
                CurriculumBenchmark.requireCohorts(queries, command[1]);
                if ("holdout".equals(command[1])) {
                    if (command.length < 4) throw new IllegalArgumentException("Holdout needs a reviewed tune set for overlap checks");
                    var tune = kindergarten
                            ? CurriculumBenchmark.loadReviewedKindergarten(Path.of(command[3]), dataset)
                            : CurriculumBenchmark.loadReviewed(Path.of(command[3]), dataset, constraints);
                    CurriculumBenchmark.requireCohorts(tune, "tune");
                    CurriculumBenchmark.requireDisjoint(tune, queries);
                }
                var measurements = kindergarten
                        ? CurriculumBenchmark.evaluateKindergarten(service, dataset, queries,
                                kindergartenTopK(environment), kindergartenMinScore(environment))
                        : CurriculumBenchmark.evaluate(service, dataset, constraints, queries);
                var metrics = CurriculumBenchmark.summarize(measurements);
                var report = new LinkedHashMap<String, Object>();
                report.put("reportVersion", 4);
                report.put("evaluationSet", command[1]);
                report.put("dataset", dataset.source());
                report.put("decisionVerifier", kindergarten ? "SCOPE_AND_THRESHOLD_ONLY_NO_PRIMARY_RULES" : "CURRICULUM_EVIDENCE_VERIFIER");
                report.put("constraintsSha256", constraints == null ? null : constraints.sha256());
                report.put("embeddingModel", config.embeddingModel());
                report.put("topK", kindergarten ? kindergartenTopK(environment) : RagSpikeConfig.TOP_K);
                report.put("minScore", kindergarten ? kindergartenMinScore(environment) : config.minScore());
                report.put("measuredAtUtc", Instant.now().toString());
                report.put("manualGameReview", "PENDING");
                report.put("summary", metrics);
                report.put("queries", measurements);
                report.put("cohorts", CurriculumBenchmark.summarizeCohorts(measurements));
                report.put("scopeAndWritingStyle", CurriculumBenchmark.summarizeByScopeAndStyle(measurements));
                report.put("querySha256", sha256(Path.of(command[2])));
                report.put("codeRevision", environment.getOrDefault("GIT_COMMIT", "UNKNOWN"));
                report.put("workingTreeDirty", Boolean.parseBoolean(environment.getOrDefault("GIT_DIRTY", "true")));
                Path reportPath = Path.of("..", "docs", "rag-spike", "results", "benchmark-" + command[1] + "-"
                        + Instant.now().toString().replace(':', '-') + ".json");
                Files.createDirectories(reportPath.getParent());
                Files.writeString(reportPath, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(report), StandardCharsets.UTF_8);
                System.out.println(mapper.writeValueAsString(metrics));
                return metrics.qualityGatePassed() ? 0 : 4;
            }
            if ("--query".equals(mode)) {
                if (command.length < (kindergarten ? 5 : 4))
                    throw new IllegalArgumentException(kindergarten
                            ? "--query SUBJECT KINDERGARTEN AGE_3_4|AGE_4_5|AGE_5_6 TOPIC"
                            : "--query SUBJECT GRADE_LEVEL TOPIC");
                Subject subject = Subject.valueOf(command[1]);
                GradeLevel grade = GradeLevel.valueOf(command[2]);
                requireQueryScope(kindergarten, grade);
                var topic = String.join(" ", Arrays.copyOfRange(command, kindergarten ? 4 : 3, command.length));
                var result = kindergarten
                        ? service.retrieveKindergarten(topic, subject, dataset.source(),
                                KindergartenAgeBand.valueOf(command[3]),
                                kindergartenTopK(environment), kindergartenMinScore(environment))
                        : service.retrieve(topic, subject, grade);
                System.out.println(mapper.writeValueAsString(result));
                return result.status() == CurriculumRAGService.Status.FOUND ? 0 : 3;
            }
            if (kindergarten)
                throw new IllegalArgumentException("Kindergarten dataset supports Extract, Ingest and Query; create its own evaluation set before Evaluate");
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

    static Path extractionOutputPath(String datasetName) {
        if (datasetName == null || !DATASETS.contains(datasetName)) {
            throw new IllegalArgumentException("Unknown curriculum dataset");
        }
        var root = Path.of("target", "curriculum-spike", "extracted").toAbsolutePath().normalize();
        var output = root.resolve(datasetName).normalize();
        if (!output.startsWith(root)) throw new IllegalArgumentException("Dataset output path is outside the extraction root");
        return Path.of("target", "curriculum-spike", "extracted", datasetName);
    }

    static void requireDraftEvaluationAllowed(boolean draftDataset, String mode, RagSpikeConfig config) {
        if (!draftDataset || "--extract".equals(mode)) return;
        if (!config.localEvaluation())
            throw new IllegalArgumentException("This draft curriculum dataset is extraction-only until reviewed; "
                    + "RAG_LOCAL_EVAL=true is allowed only with a loopback database");
        config.requireDatabase();
    }

    private static GoogleAiEmbeddingModel embedding(RagSpikeConfig config, GoogleAiEmbeddingModel.TaskType task) {
        return GoogleAiEmbeddingModel.builder().apiKey(config.apiKey()).modelName(config.embeddingModel())
                .taskType(task).outputDimensionality(RagSpikeConfig.DIMENSION).maxRetries(2)
                .timeout(Duration.ofSeconds(30)).logRequestsAndResponses(false).build();
    }

    static void requireQueryScope(boolean kindergartenDataset, GradeLevel requestedGrade) {
        if (kindergartenDataset != (requestedGrade == GradeLevel.KINDERGARTEN))
            throw new IllegalArgumentException("Requested grade does not match the selected curriculum dataset");
    }

    private static int kindergartenTopK(Map<String, String> environment) {
        int value = Integer.parseInt(environment.getOrDefault("CURRICULUM_KINDERGARTEN_TOP_K", "8"));
        if (value < 1 || value > 30) throw new IllegalArgumentException("CURRICULUM_KINDERGARTEN_TOP_K must be between 1 and 30");
        return value;
    }

    private static double kindergartenMinScore(Map<String, String> environment) {
        double value = Double.parseDouble(environment.getOrDefault("CURRICULUM_KINDERGARTEN_MIN_SCORE", "0.84"));
        if (!Double.isFinite(value) || value < -1 || value > 1)
            throw new IllegalArgumentException("CURRICULUM_KINDERGARTEN_MIN_SCORE must be between -1 and 1");
        return value;
    }

    private static String sha256(Path path) throws Exception {
        return java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                .digest(Files.readAllBytes(path)));
    }
}
