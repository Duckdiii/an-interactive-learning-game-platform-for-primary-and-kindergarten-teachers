package com.aigameplatform.backend.service.validation;

import com.aigameplatform.backend.service.admin.AiConfigService;
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import com.aigameplatform.backend.service.validation.safety.ContentModerationClient;
import com.aigameplatform.backend.service.validation.safety.GameTextExtractor.TextEntry;
import com.aigameplatform.backend.service.validation.safety.ModerationResult;
import com.aigameplatform.backend.service.validation.safety.ModerationUnavailableException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Kiểm an toàn cho một danh sách đoạn chữ (Layer 3): danh sách từ cấm trước, sạch mới gửi một lần lên OpenAI Moderation.
 * Dùng chung cho chuỗi kiểm duyệt DSL ({@link SafetyGameValidator}) và CPF; mỗi chuỗi tự quyết lấy đoạn chữ nào.
 * Thiếu OPENAI_API_KEY mà {@code app.moderation.required=true} thì ứng dụng không khởi động (một chỗ cho cả hai chuỗi).
 */
@Slf4j
@Component
public class ContentSafetyCheck {

    static final String UNSAFE_MESSAGE = "Nội dung không phù hợp với trẻ em";
    static final String UNAVAILABLE_MESSAGE = "Không kiểm tra được độ an toàn của nội dung, vui lòng thử lại sau";

    private final BlockedWordList blockedWords;
    private final ContentModerationClient moderationClient;
    private final AiConfigService aiConfigService;

    public ContentSafetyCheck(BlockedWordList blockedWords, ContentModerationClient moderationClient,
            boolean moderationRequired) {
        this(blockedWords, moderationClient, moderationRequired, null);
    }

    @Autowired
    public ContentSafetyCheck(BlockedWordList blockedWords, ContentModerationClient moderationClient,
            @Value("${app.moderation.required:true}") boolean moderationRequired, AiConfigService aiConfigService) {
        this.blockedWords = blockedWords;
        this.moderationClient = moderationClient;
        this.aiConfigService = aiConfigService;
        if (!moderationClient.isConfigured()) {
            if (moderationRequired) {
                throw new IllegalStateException(
                        "app.moderation.required=true nhưng chưa cấu hình OPENAI_API_KEY cho kiểm duyệt nội dung");
            }
            log.warn("Chưa cấu hình OPENAI_API_KEY: Layer 3 chỉ dùng danh sách từ cấm, KHÔNG gọi OpenAI Moderation");
        }
    }

    public List<ValidationError> check(List<TextEntry> texts) {
        List<ValidationError> blocked = new ArrayList<>();
        for (TextEntry entry : texts) {
            if (blockedWords.findIn(entry.text()).isPresent()) {
                blocked.add(new ValidationError(entry.path(), UNSAFE_MESSAGE, ValidationError.Kind.UNSAFE));
            }
        }
        if (!blocked.isEmpty() || texts.isEmpty() || !moderationClient.isConfigured()) {
            return blocked;
        }

        List<ModerationResult> results;
        try {
            results = moderationClient.moderate(texts.stream().map(TextEntry::text).toList());
        } catch (ModerationUnavailableException e) {
            log.error("Không kiểm tra được độ an toàn: {}", e.getMessage());
            return List.of(new ValidationError("$", UNAVAILABLE_MESSAGE, ValidationError.Kind.UNAVAILABLE));
        }

        // Thiếu kết quả nghĩa là có đoạn chưa được kiểm tra: không được coi là an toàn.
        if (results.size() != texts.size()) {
            log.error("Số kết quả kiểm duyệt ({}) khác số đoạn văn ({})", results.size(), texts.size());
            return List.of(new ValidationError("$", UNAVAILABLE_MESSAGE, ValidationError.Kind.UNAVAILABLE));
        }

        double threshold = aiConfigService == null ? AiConfigService.DEFAULT_MODERATION_THRESHOLD
                : aiConfigService.getActiveConfig().moderationThreshold();
        List<ValidationError> flagged = new ArrayList<>();
        for (int i = 0; i < results.size(); i++) {
            ModerationResult result = results.get(i);
            List<String> categories = result.flagged() ? result.categories() : result.categoryScores().entrySet().stream()
                    .filter(entry -> entry.getValue() >= threshold)
                    .map(Map.Entry::getKey)
                    .sorted().toList();
            if (result.flagged() || !categories.isEmpty()) {
                String message = categories.isEmpty() ? UNSAFE_MESSAGE
                        : UNSAFE_MESSAGE + " (" + String.join(", ", categories) + ")";
                flagged.add(new ValidationError(texts.get(i).path(), message, ValidationError.Kind.UNSAFE));
            }
        }
        return flagged;
    }
}
