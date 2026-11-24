package com.aigameplatform.backend.service.validation.safety;

import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.JsonNode;

/** Gọi OpenAI Moderation API. Không bao giờ ghi API key ra log. */
@Component
public class OpenAiModerationClient implements ContentModerationClient {

    private static final int BATCH_SIZE = 20;
    // Giới hạn bộ nhớ: bỏ đoạn lâu không dùng nhất khi vượt quá (đủ cho nhiều game đang soạn cùng lúc).
    private static final int MAX_REMEMBERED = 5_000;
    // Kết quả "an toàn" chỉ tin trong 24 giờ: OpenAI có thể đổi model/policy sau cùng một tên model.
    private static final Duration APPROVAL_TTL = Duration.ofHours(24);

    private record CachedModeration(Instant checkedAt, ModerationResult result) {}

    // Giữ điểm gốc để áp dụng ngưỡng đang hoạt động ở mỗi lần kiểm, kể cả khi trúng cache.
    private final Map<String, CachedModeration> approved = java.util.Collections.synchronizedMap(
            new java.util.LinkedHashMap<String, CachedModeration>(256, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, CachedModeration> eldest) {
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
        Map<String, ModerationResult> checked = new HashMap<>();
        List<String> unknown = new ArrayList<>();
        for (String text : texts.stream().distinct().toList()) {
            CachedModeration cached = approved.get(text);
            if (cached == null || cached.checkedAt().isBefore(cutoff)) {
                unknown.add(text);
            } else {
                checked.put(text, cached.result());
            }
        }
        for (int from = 0; from < unknown.size(); from += BATCH_SIZE) {
            List<String> batch = unknown.subList(from, Math.min(from + BATCH_SIZE, unknown.size()));
            List<ModerationResult> batchResults = moderateBatch(batch);
            for (int i = 0; i < batch.size(); i++) {
                ModerationResult result = batchResults.get(i);
                checked.put(batch.get(i), result);
                if (!result.flagged()) approved.put(batch.get(i), new CachedModeration(Instant.now(), result));
            }
        }
        return texts.stream().map(checked::get).toList();
    }

    public ModerationResult moderateImage(byte[] image, String mediaType) {
        String url = "data:" + mediaType + ";base64," + Base64.getEncoder().encodeToString(image);
        return requestModeration(List.of(Map.of("type", "image_url", "image_url", Map.of("url", url))), 1, true)
                .getFirst();
    }

    /** Nội dung phiên âm chỉ tồn tại trong lần kiểm tra này, không đi qua bộ nhớ đệm văn bản. */
    public ModerationResult moderateTranscript(String transcript) {
        return requestModeration(List.of(transcript), 1, false).getFirst();
    }

    public String transcribeMp3(byte[] audio) {
        requireConfigured();
        var parts = new LinkedMultiValueMap<String, Object>();
        parts.add("model", "gpt-transcribe");
        parts.add("file", new ByteArrayResource(audio) {
            @Override
            public String getFilename() {
                return "speech.mp3";
            }
        });
        JsonNode response;
        try {
            response = restClient.post()
                    .uri("/v1/audio/transcriptions")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(parts)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientException e) {
            throw new ModerationUnavailableException("Không phiên âm được tệp MP3", e);
        }
        JsonNode transcript = response == null ? null : response.get("text");
        if (transcript == null || !transcript.isString()) {
            throw new ModerationUnavailableException("Kết quả phiên âm không đúng định dạng");
        }
        return transcript.asString();
    }

    private void requireConfigured() {
        if (!isConfigured()) {
            throw new ModerationUnavailableException("Chưa cấu hình dịch vụ kiểm duyệt");
        }
    }

    private List<ModerationResult> moderateBatch(List<String> batch) {
        return requestModeration(batch, batch.size(), false);
    }

    private List<ModerationResult> requestModeration(List<?> input, int resultCount, boolean imageOnly) {
        requireConfigured();
        JsonNode response;
        try {
            response = restClient.post()
                    .uri("/v1/moderations")
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("model", model, "input", input))
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientException e) {
            // Chỉ ghi loại lỗi, không ghi nội dung request hay header (có API key).
            throw new ModerationUnavailableException("Gọi OpenAI Moderation thất bại: " + e.getClass().getSimpleName(), e);
        }

        JsonNode results = response == null ? null : response.get("results");
        if (results == null || !results.isArray() || results.size() != resultCount) {
            throw new ModerationUnavailableException("Phản hồi của OpenAI Moderation không đúng định dạng");
        }
        List<ModerationResult> parsed = new ArrayList<>();
        for (JsonNode result : results) {
            JsonNode flagged = result.path("flagged");
            if (!flagged.isBoolean()) {
                throw new ModerationUnavailableException("Kết quả kiểm duyệt thiếu trạng thái hợp lệ");
            }
            boolean isFlagged = flagged.asBoolean();
            Map<String, Double> scores = isFlagged ? Map.of() : readScores(result, imageOnly);
            parsed.add(new ModerationResult(isFlagged, flaggedCategories(result), scores));
        }
        return parsed;
    }

    private static Map<String, Double> readScores(JsonNode result, boolean imageOnly) {
        JsonNode scores = result.path("category_scores");
        JsonNode inputTypes = result.path("category_applied_input_types");
        Map<String, Double> parsed = new HashMap<>();
        if (scores.isObject()) {
            for (var entry : scores.properties()) {
                if (imageOnly && !appliesToImage(inputTypes.path(entry.getKey()))) continue;
                JsonNode value = entry.getValue();
                if (!value.isNumber() || !(value.asDouble() >= 0 && value.asDouble() <= 1)) {
                    throw new ModerationUnavailableException("Điểm kiểm duyệt ngoài phạm vi hợp lệ");
                }
                parsed.put(entry.getKey(), value.asDouble());
            }
        }
        if (parsed.isEmpty()) {
            throw new ModerationUnavailableException("Kết quả kiểm duyệt thiếu điểm theo nhóm");
        }
        return parsed;
    }

    private static boolean appliesToImage(JsonNode inputTypes) {
        if (!inputTypes.isArray()) {
            throw new ModerationUnavailableException("Kết quả kiểm duyệt thiếu thông tin về nhóm áp dụng cho ảnh");
        }
        for (JsonNode type : inputTypes) {
            if ("image".equals(type.asString())) return true;
        }
        return false;
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
