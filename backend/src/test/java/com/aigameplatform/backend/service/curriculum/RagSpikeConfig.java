package com.aigameplatform.backend.service.curriculum;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

/** Secrets are read from the process environment and never included in diagnostic output. */
public record RagSpikeConfig(String apiKey, String dbUrl, String dbUser, String dbPassword,
                             String embeddingModel, double minScore, String pdfPath,
                             boolean localEvaluation) {
    public static final int DIMENSION = 768;
    public static final int TOP_K = 3;

    public static RagSpikeConfig from(Map<String, String> environment) {
        double minScore = Double.parseDouble(environment.getOrDefault("RAG_MIN_SCORE", "0.855"));
        if (!Double.isFinite(minScore) || minScore < 0 || minScore > 1)
            throw new IllegalArgumentException("RAG_MIN_SCORE must be finite and between 0 and 1");
        String localEvaluationValue = environment.getOrDefault("RAG_LOCAL_EVAL", "false");
        if (!"true".equalsIgnoreCase(localEvaluationValue) && !"false".equalsIgnoreCase(localEvaluationValue))
            throw new IllegalArgumentException("RAG_LOCAL_EVAL must be true or false");
        return new RagSpikeConfig(environment.getOrDefault("GEMINI_API_KEY", ""),
                environment.getOrDefault("DB_URL", ""), environment.getOrDefault("DB_USERNAME", ""),
                environment.getOrDefault("DB_PASSWORD", ""),
                environment.getOrDefault("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001"), minScore,
                environment.getOrDefault("CURRICULUM_PDF", ""), Boolean.parseBoolean(localEvaluationValue));
    }

    public Map<String, Boolean> safeStatus() {
        var result = new LinkedHashMap<String, Boolean>();
        result.put("GEMINI_API_KEY", filled(apiKey));
        result.put("DB_URL", filled(dbUrl));
        result.put("DB_USERNAME", filled(dbUser));
        result.put("DB_PASSWORD", filled(dbPassword));
        result.put("CURRICULUM_PDF", filled(pdfPath));
        result.put("RAG_LOCAL_EVAL", localEvaluation);
        return result;
    }

    public void requireDatabase() {
        if (!filled(dbUrl) || !filled(dbUser) || !filled(dbPassword))
            throw new IllegalStateException("Configure DB_URL, DB_USERNAME and DB_PASSWORD in the local .env");
        if (!dbUrl.startsWith("jdbc:postgresql://"))
            throw new IllegalArgumentException("DB_URL must be a PostgreSQL JDBC URL");
        URI uri = URI.create(dbUrl.substring(5));
        String host = uri.getHost();
        boolean loopback = "localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host)
                || "::1".equals(host) || "[::1]".equals(host);
        if (host == null || uri.getUserInfo() != null
                || (uri.getRawQuery() != null && uri.getRawQuery().matches("(?i).*(user|password)=.*")))
            throw new IllegalArgumentException("Use Session pooler/Direct port 5432 and separate DB credentials");
        if (localEvaluation) {
            if (!loopback || uri.getPort() < 1 || uri.getPort() > 65535)
                throw new IllegalArgumentException("Local evaluation permits only an explicit loopback PostgreSQL URL");
        } else if (uri.getPort() != 5432) {
            throw new IllegalArgumentException("Use Session pooler/Direct port 5432 and separate DB credentials");
        }
    }

    public void requireEmbedding() {
        if (!filled(apiKey)) throw new IllegalStateException("Configure GEMINI_API_KEY in the local .env");
        if (!"gemini-embedding-001".equals(embeddingModel))
            throw new IllegalArgumentException("This reviewed spike uses gemini-embedding-001 with 768 dimensions");
    }

    private static boolean filled(String value) {
        return value != null && !value.isBlank() && !value.contains("<") && !value.contains(">");
    }

    @Override
    public String toString() { return "RagSpikeConfig" + safeStatus(); }
}
