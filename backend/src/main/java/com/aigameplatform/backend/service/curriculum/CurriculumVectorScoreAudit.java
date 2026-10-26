package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.entity.enums.Subject;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.model.googleai.GoogleAiEmbeddingModel;
import java.io.PrintStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Read-only replay that compares exact and terminal-corrupted query vectors with the indexed source vector. */
public final class CurriculumVectorScoreAudit {
    private static final String SOURCE_QUERY_PROBE = "query-probes/probe-2026-10-11T18-16-55.699114100Z.json";
    private static final String HISTORICAL_CLEAN_RUN = "live-2026-10-10T16-36-56.842743600Z.json";

    private CurriculumVectorScoreAudit() { }

    public static void main(String[] args) {
        System.setOut(new PrintStream(System.out, true, StandardCharsets.UTF_8));
        try {
            run();
        } catch (Exception exception) {
            System.err.println("Vector score audit failed (" + exception.getClass().getSimpleName()
                    + "); secret values were not printed");
            System.exit(1);
        }
    }

    static Map<String, Object> run() throws Exception {
        var config = RagSpikeConfig.from(System.getenv());
        config.requireDatabase();
        config.requireEmbedding();
        var mapper = new JsonMapper();
        var dataset = CurriculumDataset.loadDefault();
        var positive = CurriculumEvaluation.loadQueries().stream()
                .filter(query -> query.queryId().equals("q01")).findFirst().orElseThrow();
        JsonNode oldProbe = mapper.readTree(Path.of("..", "docs", "rag-spike", "results", SOURCE_QUERY_PROBE));
        JsonNode cleanRun = mapper.readTree(Path.of("..", "docs", "rag-spike", "results", HISTORICAL_CLEAN_RUN));
        String damagedQuery = oldProbe.get("topic").asString();
        double damagedObserved = oldProbe.at("/result/chunks/0/score").asDouble();
        double cleanObserved = cleanRun.at("/queries/0/returned/0/score").asDouble();
        var target = dataset.chunks().stream().filter(chunk -> chunk.chunkId().equals("math-g1-007"))
                .findFirst().orElseThrow();

        var queryModel = GoogleAiEmbeddingModel.builder().apiKey(config.apiKey()).modelName(config.embeddingModel())
                .taskType(GoogleAiEmbeddingModel.TaskType.RETRIEVAL_QUERY)
                .outputDimensionality(RagSpikeConfig.DIMENSION).maxRetries(2).timeout(Duration.ofSeconds(30))
                .logRequestsAndResponses(false).build();
        Embedding cleanVector = queryModel.embed(positive.topic()).content();
        Embedding damagedVector = queryModel.embed(damagedQuery).content();
        List<Float> documentVector;
        try (var database = CurriculumSpikeDatabase.connect(config)) {
            documentVector = vectorForChunk(database, dataset, config.embeddingModel(), target.chunkId());
        }

        var cleanEntry = vectorEntry("UTF8_FIXTURE_QUERY", positive.topic(), cleanVector, documentVector,
                cleanObserved);
        var damagedEntry = vectorEntry("ARCHIVED_QUERY_WITH_REPLACEMENT_QUESTION_MARKS", damagedQuery,
                damagedVector, documentVector, damagedObserved);
        var targetMetadata = new LinkedHashMap<String, Object>();
        targetMetadata.put("chunkId", target.chunkId());
        targetMetadata.put("subject", target.subject().name());
        targetMetadata.put("gradeLevel", target.gradeLevel().name());
        targetMetadata.put("topic", target.topic());
        targetMetadata.put("text", target.text());
        targetMetadata.put("sourceDocument", dataset.source().sourceDocument());
        targetMetadata.put("sourceSha256", dataset.source().sourceSha256());
        targetMetadata.put("sourcePdfPages", target.sourceFragments().stream().map(CurriculumChunk.SourceFragment::pdfPage)
                .distinct().toList());
        targetMetadata.put("curriculumVersion", dataset.source().curriculumVersion());
        targetMetadata.put("datasetVersion", dataset.source().datasetVersion());
        targetMetadata.put("embeddingModel", config.embeddingModel());
        targetMetadata.put("embeddingDimension", documentVector.size());
        targetMetadata.put("vectorL2Norm", l2Norm(documentVector));
        targetMetadata.put("vectorSha256", vectorSha256(documentVector));

        var artifact = new LinkedHashMap<String, Object>();
        artifact.put("runAtUtc", Instant.now().toString());
        artifact.put("status", "LIVE_VECTOR_REPLAY_EXPLORATORY_ONLY");
        artifact.put("subject", Subject.MATH.name());
        artifact.put("gradeLevel", "GRADE_1");
        artifact.put("embeddingModel", config.embeddingModel());
        artifact.put("queryTaskType", "RETRIEVAL_QUERY");
        artifact.put("documentTaskType", "RETRIEVAL_DOCUMENT (from ingestion code/configuration)");
        artifact.put("dimension", RagSpikeConfig.DIMENSION);
        artifact.put("localNormalization", "No application-side vector normalization is called before retrieval or storage");
        artifact.put("scoreInterpretation", "LangChain4j PgVectorEmbeddingStore computes score=(2-cosine_distance)/2; since cosine_distance=1-cosine_similarity, the displayed relevance is (1+cosine_similarity)/2");
        artifact.put("retriever", Map.of("topK", RagSpikeConfig.DEFAULT_TOP_K, "filterSubject", "MATH",
                "filterGradeLevel", "GRADE_1", "filterContentType", "curriculum_outcome",
                "filterDatasetVersion", dataset.source().datasetVersion(), "minScoreRuns", List.of(0.75, 0.855)));
        artifact.put("scope", Map.of("subject", "MATH", "gradeLevel", "GRADE_1"));
        artifact.put("historicalQueryTextCodePoints", codePoints(cleanRun.at("/queries/0/topic").asString()));
        artifact.put("cleanQuery", cleanEntry);
        artifact.put("archivedDamagedQuery", damagedEntry);
        artifact.put("document", Map.of("metadata", targetMetadata, "vector", documentVector));
        artifact.put("interpretationLimit", "The archive did not retain historical vectors. This replay uses the current deterministic source/model row and current API embeddings; it does not prove an unrecorded past row could not have changed.");

        Path output = Path.of("..", "docs", "rag-spike", "results", "score-investigations");
        Files.createDirectories(output);
        String runId = Instant.now().toString().replace(':', '-');
        Path report = output.resolve("vector-replay-" + runId + ".json");
        Files.writeString(report, mapper.writerWithDefaultPrettyPrinter().writeValueAsString(artifact), StandardCharsets.UTF_8);
        System.out.println("Vector replay saved: " + report.toAbsolutePath().normalize());
        System.out.println(mapper.writeValueAsString(Map.of("cleanCosine", cleanEntry.get("cosineSimilarityWithDocument"),
                "cleanPgVectorScore", cleanEntry.get("pgVectorRelevanceScore"),
                "damagedCosine", damagedEntry.get("cosineSimilarityWithDocument"),
                "damagedPgVectorScore", damagedEntry.get("pgVectorRelevanceScore"),
                "cleanScoreDeltaFromArchive", cleanEntry.get("pgVectorScoreDeltaFromArchive"),
                "damagedScoreDeltaFromArchive", damagedEntry.get("pgVectorScoreDeltaFromArchive"))));
        return Map.copyOf(artifact);
    }

    static List<Float> parsePgVector(String vectorText) {
        if (vectorText == null || !vectorText.startsWith("[") || !vectorText.endsWith("]"))
            throw new IllegalArgumentException("Invalid pgvector text format");
        String content = vectorText.substring(1, vectorText.length() - 1).trim();
        if (content.isEmpty()) throw new IllegalArgumentException("Empty pgvector is invalid");
        var values = new ArrayList<Float>();
        for (String part : content.split(",", -1)) {
            try {
                float value = Float.parseFloat(part.trim());
                if (!Float.isFinite(value)) throw new NumberFormatException("non-finite");
                values.add(value);
            } catch (NumberFormatException exception) {
                throw new IllegalArgumentException("Invalid pgvector component", exception);
            }
        }
        return List.copyOf(values);
    }

    static double cosineSimilarity(List<Float> first, List<Float> second) {
        if (first == null || second == null || first.isEmpty() || first.size() != second.size())
            throw new IllegalArgumentException("Cosine similarity requires equal non-empty vectors");
        double dot = 0;
        double firstNorm = 0;
        double secondNorm = 0;
        for (int i = 0; i < first.size(); i++) {
            float a = first.get(i);
            float b = second.get(i);
            if (!Float.isFinite(a) || !Float.isFinite(b)) throw new IllegalArgumentException("Non-finite vector value");
            dot += (double) a * b;
            firstNorm += (double) a * a;
            secondNorm += (double) b * b;
        }
        if (firstNorm == 0 || secondNorm == 0) throw new IllegalArgumentException("Zero vector has no cosine similarity");
        return dot / (Math.sqrt(firstNorm) * Math.sqrt(secondNorm));
    }

    private static List<Float> vectorForChunk(javax.sql.DataSource database, CurriculumDataset dataset,
                                               String model, String chunkId) throws Exception {
        try (var connection = database.getConnection(); var statement = connection.prepareStatement("""
                SELECT embedding::text FROM public.curriculum_embeddings
                WHERE metadata->>'chunkId' = ? AND metadata->>'subject' = 'MATH'
                  AND metadata->>'gradeLevel' = 'GRADE_1' AND metadata->>'datasetVersion' = ?
                  AND metadata->>'sourceSha256' = ? AND metadata->>'embeddingModel' = ?
                """)) {
            statement.setString(1, chunkId);
            statement.setString(2, dataset.source().datasetVersion());
            statement.setString(3, dataset.source().sourceSha256());
            statement.setString(4, model);
            try (var rows = statement.executeQuery()) {
                if (!rows.next()) throw new IllegalStateException("Expected document vector is not indexed");
                List<Float> vector = parsePgVector(rows.getString(1));
                if (rows.next()) throw new IllegalStateException("More than one indexed vector matched the chunk");
                if (vector.size() != RagSpikeConfig.DIMENSION)
                    throw new IllegalStateException("Stored document vector dimension differs from the configured dimension");
                return vector;
            }
        }
    }

    private static Map<String, Object> vectorEntry(String label, String query, Embedding embedding,
                                                   List<Float> documentVector, double archivedScore) {
        List<Float> vector = embedding.vectorAsList();
        if (vector.size() != RagSpikeConfig.DIMENSION)
            throw new IllegalStateException("Query vector dimension differs from the configured dimension");
        double cosine = cosineSimilarity(vector, documentVector);
        var result = new LinkedHashMap<String, Object>();
        result.put("label", label);
        result.put("queryText", query);
        result.put("queryCodePoints", codePoints(query));
        result.put("dimension", vector.size());
        result.put("l2Norm", l2Norm(vector));
        result.put("vectorSha256", vectorSha256(vector));
        result.put("vector", vector);
        result.put("cosineSimilarityWithDocument", cosine);
        result.put("pgVectorRelevanceScore", pgVectorRelevanceScore(cosine));
        result.put("archivedScore", archivedScore);
        result.put("pgVectorScoreDeltaFromArchive", Math.abs(pgVectorRelevanceScore(cosine) - archivedScore));
        return Map.copyOf(result);
    }

    static double pgVectorRelevanceScore(double cosineSimilarity) {
        if (!Double.isFinite(cosineSimilarity) || cosineSimilarity < -1.000001 || cosineSimilarity > 1.000001)
            throw new IllegalArgumentException("Cosine similarity must be finite and in [-1, 1]");
        return (1 + cosineSimilarity) / 2;
    }

    private static List<String> codePoints(String text) {
        return text.codePoints().mapToObj(Integer::toHexString).toList();
    }

    private static double l2Norm(List<Float> vector) {
        return Math.sqrt(vector.stream().mapToDouble(value -> (double) value * value).sum());
    }

    private static String vectorSha256(List<Float> vector) {
        ByteBuffer bytes = ByteBuffer.allocate(vector.size() * Float.BYTES).order(ByteOrder.BIG_ENDIAN);
        vector.forEach(bytes::putFloat);
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes.array()));
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
}
