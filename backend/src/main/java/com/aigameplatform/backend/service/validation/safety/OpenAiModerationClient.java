package com.aigameplatform.backend.service.validation.safety;

import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
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
    private static final ModerationResult SAFE = new ModerationResult(false, List.of());
    // Giới hạn bộ nhớ: bỏ đoạn lâu không dùng nhất khi vượt quá (đủ cho nhiều game đang soạn cùng lúc).
    private static final int MAX_REMEMBERED = 5_000;
    // Kết quả "an toàn" chỉ tin trong 24 giờ: OpenAI có thể đổi model/policy sau cùng một tên model.
    private static final Duration APPROVAL_TTL = Duration.ofHours(24);

    /** Đoạn chữ đã được OpenAI xác nhận không vi phạm, kèm thời điểm duyệt (LRU, an toàn khi nhiều request cùng lúc). */
    private final Map<String, Instant> approved = java.util.Collections.synchronizedMap(
            new java.util.LinkedHashMap<String, Instant>(256, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, Instant> eldest) {
                    return size() > MAX_REMEMBERED;
                }
            });

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
        // Chỉ gửi đoạn chưa từng được duyệt an toàn: lưu game gửi lại toàn bộ chữ, phần lớn không đổi giữa các lần lưu.
        Instant cutoff = Instant.now().minus(APPROVAL_TTL);
        // get() (không phải containsKey) để làm mới thứ tự LRU khi trúng.
        List<String> unknown = texts.stream().filter(text -> {
            Instant at = approved.get(text);
            return at == null || at.isBefore(cutoff);
        }).distinct().toList();
        Map<String, ModerationResult> fresh = new java.util.HashMap<>();
        for (int from = 0; from < unknown.size(); from += BATCH_SIZE) {
            List<String> batch = unknown.subList(from, Math.min(from + BATCH_SIZE, unknown.size()));
            List<ModerationResult> batchResults = moderateBatch(batch);
            for (int i = 0; i < batch.size(); i++) {
                fresh.put(batch.get(i), batchResults.get(i));
                // Bị gắn cờ thì không nhớ: lần sau vẫn gửi kiểm lại.
                if (!batchResults.get(i).flagged()) approved.put(batch.get(i), Instant.now());
            }
        }
        return texts.stream().map(text -> fresh.getOrDefault(text, SAFE)).toList();
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
