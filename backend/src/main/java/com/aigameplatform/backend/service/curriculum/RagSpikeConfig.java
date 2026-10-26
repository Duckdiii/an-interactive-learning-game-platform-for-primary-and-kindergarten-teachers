package com.aigameplatform.backend.service.curriculum;

import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;

/** Secrets are read from the process environment and never included in diagnostic output. */
public record RagSpikeConfig(String apiKey, String dbUrl, String dbUser, String dbPassword,
                             String embeddingModel, int topK, double minScore, String pdfPath) {
    public static final int DIMENSION = 768;
    public static final int DEFAULT_TOP_K = 3;
    public static final int MAX_TOP_K = 50;

    public static RagSpikeConfig from(Map<String, String> environment) {
        int topK = Integer.parseInt(environment.getOrDefault("CURRICULUM_RAG_TOP_K", "" + DEFAULT_TOP_K));
        if (topK < 1 || topK > MAX_TOP_K)
            throw new IllegalArgumentException("CURRICULUM_RAG_TOP_K must be between 1 and " + MAX_TOP_K);
        double minScore = Double.parseDouble(environment.getOrDefault("RAG_MIN_SCORE", "0.855"));
        if (!Double.isFinite(minScore) || minScore < 0 || minScore > 1)
            throw new IllegalArgumentException("RAG_MIN_SCORE must be finite and between 0 and 1");
        return new RagSpikeConfig(environment.getOrDefault("GEMINI_API_KEY", ""),
                environment.getOrDefault("DB_URL", ""), environment.getOrDefault("DB_USERNAME", ""),
                environment.getOrDefault("DB_PASSWORD", ""),
                environment.getOrDefault("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001"), topK, minScore,
                environment.getOrDefault("CURRICULUM_PDF", ""));
    }

    public Map<String, Boolean> safeStatus() {
        var result = new LinkedHashMap<String, Boolean>();
        result.put("GEMINI_API_KEY", filled(apiKey));
        result.put("DB_URL", filled(dbUrl));
        result.put("DB_USERNAME", filled(dbUser));
        result.put("DB_PASSWORD", filled(dbPassword));
        result.put("CURRICULUM_PDF", filled(pdfPath));
        return result;
    }

    public void requireDatabase() {
        if (!filled(dbUrl) || !filled(dbUser) || !filled(dbPassword))
            throw new IllegalStateException("Configure DB_URL, DB_USERNAME and DB_PASSWORD in the local .env");
        if (!dbUrl.startsWith("jdbc:postgresql://"))
            throw new IllegalArgumentException("DB_URL must be a PostgreSQL JDBC URL");
        URI uri = URI.create(dbUrl.substring(5));
        if (uri.getHost() == null || uri.getUserInfo() != null || uri.getPort() != 5432
                || (uri.getRawQuery() != null && uri.getRawQuery().matches("(?i).*(user|password)=.*")))
            throw new IllegalArgumentException("Use Session pooler/Direct port 5432 and separate DB credentials");
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
