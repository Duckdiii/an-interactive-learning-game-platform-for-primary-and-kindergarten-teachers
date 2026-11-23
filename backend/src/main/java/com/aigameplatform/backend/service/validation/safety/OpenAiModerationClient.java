package com.aigameplatform.backend.service.validation.safety;

import java.net.http.HttpClient;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
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

    public ModerationResult moderateImage(byte[] image, String mediaType) {
        String url = "data:" + mediaType + ";base64," + Base64.getEncoder().encodeToString(image);
        return requestModeration(List.of(Map.of("type", "image_url", "image_url", Map.of("url", url))), 1)
                .getFirst();
    }

    /** Nội dung phiên âm chỉ tồn tại trong lần kiểm tra này, không đi qua bộ nhớ đệm văn bản. */
    public ModerationResult moderateTranscript(String transcript) {
        return requestModeration(List.of(transcript), 1).getFirst();
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
        return requestModeration(batch, batch.size());
    }

    private List<ModerationResult> requestModeration(List<?> input, int resultCount) {
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
            parsed.add(new ModerationResult(flagged.asBoolean(), flaggedCategories(result)));
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
