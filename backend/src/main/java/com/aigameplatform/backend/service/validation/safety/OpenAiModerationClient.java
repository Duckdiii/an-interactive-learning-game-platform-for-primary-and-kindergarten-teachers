package com.aigameplatform.backend.service.validation.safety;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.JsonNode;

/** Gọi OpenAI Moderation API. Không bao giờ ghi API key ra log. */
@Component
public class OpenAiModerationClient implements ContentModerationClient {

    private static final int BATCH_SIZE = 20;

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    @Autowired
    public OpenAiModerationClient(
            @Value("${app.moderation.openai.base-url}") String baseUrl,
            @Value("${app.moderation.openai.api-key:}") String apiKey,
            @Value("${app.moderation.openai.model}") String model,
            @Value("${app.moderation.openai.timeout-seconds}") long timeoutSeconds) {
        this(RestClient.builder().baseUrl(baseUrl).requestFactory(requestFactory(timeoutSeconds)), apiKey, model);
    }

    /** Dùng cho test: truyền builder đã gắn máy chủ giả. */
    OpenAiModerationClient(RestClient.Builder builder, String apiKey, String model) {
        this.restClient = builder.build();
        this.apiKey = apiKey == null ? "" : apiKey.strip();
        this.model = model;
    }

    private static JdkClientHttpRequestFactory requestFactory(long timeoutSeconds) {
        Duration timeout = Duration.ofSeconds(timeoutSeconds);
        JdkClientHttpRequestFactory factory =
                new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(timeout).build());
        factory.setReadTimeout(timeout);
        return factory;
    }

    @Override
    public boolean isConfigured() {
        return !apiKey.isBlank();
    }

    @Override
    public List<ModerationResult> moderate(List<String> texts) {
        if (!isConfigured()) {
            throw new IllegalStateException("Chưa cấu hình API key của OpenAI");
        }
        List<ModerationResult> results = new ArrayList<>();
        for (int from = 0; from < texts.size(); from += BATCH_SIZE) {
            results.addAll(moderateBatch(texts.subList(from, Math.min(from + BATCH_SIZE, texts.size()))));
        }
        return results;
    }

    private List<ModerationResult> moderateBatch(List<String> batch) {
        JsonNode response;
        try {
            response = restClient.post()
                    .uri("/v1/moderations")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("model", model, "input", batch))
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientException e) {
            // Chỉ ghi loại lỗi, không ghi nội dung request hay header (có API key).
            throw new ModerationUnavailableException("Gọi OpenAI Moderation thất bại: " + e.getClass().getSimpleName(), e);
        }

        JsonNode results = response == null ? null : response.get("results");
        if (results == null || !results.isArray() || results.size() != batch.size()) {
            throw new ModerationUnavailableException("Phản hồi của OpenAI Moderation không đúng định dạng");
        }
        List<ModerationResult> parsed = new ArrayList<>();
        for (JsonNode result : results) {
            parsed.add(new ModerationResult(result.path("flagged").asBoolean(false), flaggedCategories(result)));
        }
        return parsed;
    }

    private static List<String> flaggedCategories(JsonNode result) {
        List<String> categories = new ArrayList<>();
        result.path("categories").properties().forEach(entry -> {
            if (entry.getValue().asBoolean(false)) {
                categories.add(entry.getKey());
            }
        });
        return categories;
    }
}
