package com.aigameplatform.backend.service.generation;

import dev.langchain4j.exception.HttpException;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Safe provider diagnostics retained by LangChain4j when a Gemini request fails. */
record GeminiProviderFailureDetails(Integer httpStatus, String providerCode,
                                    String providerMessage, String correlationId) {
    private static final JsonMapper JSON = new JsonMapper();
    private static final Pattern TOKEN = Pattern.compile("(?i)AIza[0-9A-Za-z_-]{20,}");
    private static final Pattern BEARER = Pattern.compile("(?i)Bearer\\s+[^\\s,;]+");
    private static final Pattern CREDENTIAL = Pattern.compile(
            "(?i)(api[_-]?key|access[_-]?token|authorization|password|secret)(\\s*[:=]\\s*)([^\\s,;}]+)");
    private static final Pattern CORRELATION = Pattern.compile(
            "(?i)(?:x-goog-request-id|x-request-id|requestId|correlationId)\\s*[:=]\\s*([A-Za-z0-9._:-]{1,128})");
    private static final int MAX_MESSAGE_LENGTH = 400;

    static GeminiProviderFailureDetails from(Throwable failure) {
        HttpException httpException = findHttpException(failure);
        String raw = httpException == null ? failure == null ? null : failure.getMessage() : httpException.getMessage();
        JsonNode root = parse(raw);
        JsonNode error = root == null ? null : root.get("error");

        String providerCode = firstText(error, "status", "reason", "code");
        if (providerCode == null) providerCode = httpException == null ? "UNAVAILABLE" : "UNKNOWN";
        String providerMessage = firstText(error, "message", "detail");
        if (providerMessage == null) providerMessage = raw;
        String correlationId = firstText(root, "requestId", "request_id", "correlationId", "traceId");
        if (correlationId == null && raw != null) {
            Matcher matcher = CORRELATION.matcher(raw);
            if (matcher.find()) correlationId = matcher.group(1);
        }
        return new GeminiProviderFailureDetails(httpException == null ? null : httpException.statusCode(),
                safe(providerCode, 128), safe(providerMessage, MAX_MESSAGE_LENGTH), safe(correlationId, 128));
    }

    private static HttpException findHttpException(Throwable failure) {
        Set<Throwable> visited = Collections.newSetFromMap(new IdentityHashMap<>());
        for (Throwable current = failure; current != null && visited.add(current); current = current.getCause()) {
            if (current instanceof HttpException httpException) return httpException;
        }
        return null;
    }

    private static JsonNode parse(String value) {
        if (value == null) return null;
        try {
            return JSON.readTree(value);
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private static String firstText(JsonNode node, String... fields) {
        if (node == null) return null;
        for (String field : fields) {
            JsonNode value = node.get(field);
            if (value != null && !value.isNull() && value.isValueNode()) {
                String text = value.asString();
                if (text != null && !text.isBlank()) return text;
            }
        }
        return null;
    }

    private static String safe(String value, int maxLength) {
        if (value == null || value.isBlank()) return null;
        String scrubbed = TOKEN.matcher(value).replaceAll("[REDACTED]");
        scrubbed = BEARER.matcher(scrubbed).replaceAll("Bearer [REDACTED]");
        scrubbed = CREDENTIAL.matcher(scrubbed).replaceAll("$1$2[REDACTED]");
        scrubbed = scrubbed.replaceAll("(?i)(https?://[^\\s?]+)\\?[^\\s]+", "$1?[REDACTED]");
        return scrubbed.length() <= maxLength ? scrubbed : scrubbed.substring(0, maxLength);
    }
}
