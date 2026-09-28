package com.aigameplatform.backend.service.validation;

import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import com.aigameplatform.backend.service.validation.safety.ContentModerationClient;
import com.aigameplatform.backend.service.validation.safety.GameTextExtractor;
import com.aigameplatform.backend.service.validation.safety.ModerationResult;
import com.aigameplatform.backend.service.validation.safety.ModerationUnavailableException;
import java.util.ArrayList;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Layer 3 (an toàn): nội dung dành cho trẻ 5-11 tuổi phải sạch. Đối chiếu danh sách từ cấm trước (nhanh, không
 * tốn tiền), nếu sạch mới gửi một lần lên OpenAI Moderation. Lỗi ở lớp này là UNSAFE hoặc UNAVAILABLE chứ không
 * phải INVALID: không cho AI sinh lại mà từ chối hoặc báo thử lại.
 */
@Slf4j
@Component
@Order(3)
public class SafetyGameValidator extends AbstractGameValidator {

    private static final String UNSAFE_MESSAGE = "Nội dung không phù hợp với trẻ em";
    private static final String UNAVAILABLE_MESSAGE = "Không kiểm tra được độ an toàn của nội dung, vui lòng thử lại sau";

    private final BlockedWordList blockedWords;
    private final ContentModerationClient moderationClient;

    public SafetyGameValidator(
            BlockedWordList blockedWords,
            ContentModerationClient moderationClient,
            @Value("${app.moderation.required:false}") boolean moderationRequired) {
        this.blockedWords = blockedWords;
        this.moderationClient = moderationClient;
        if (!moderationClient.isConfigured()) {
            if (moderationRequired) {
                throw new IllegalStateException(
                        "app.moderation.required=true nhưng chưa cấu hình OPENAI_API_KEY cho kiểm duyệt nội dung");
            }
            log.warn("Chưa cấu hình OPENAI_API_KEY: Layer 3 chỉ dùng danh sách từ cấm, KHÔNG gọi OpenAI Moderation");
        }
    }

    @Override
    protected List<ValidationError> check(GameValidationContext context) {
        List<GameTextExtractor.TextEntry> texts = GameTextExtractor.extract(context.getJson());

        List<ValidationError> blocked = new ArrayList<>();
        for (GameTextExtractor.TextEntry entry : texts) {
            if (blockedWords.findIn(entry.text()).isPresent()) {
                blocked.add(new ValidationError(entry.path(), UNSAFE_MESSAGE, ValidationError.Kind.UNSAFE));
            }
        }
        if (!blocked.isEmpty() || texts.isEmpty() || !moderationClient.isConfigured()) {
            return blocked;
        }

        List<ModerationResult> results;
        try {
            results = moderationClient.moderate(texts.stream().map(GameTextExtractor.TextEntry::text).toList());
        } catch (ModerationUnavailableException e) {
            log.error("Không kiểm tra được độ an toàn: {}", e.getMessage());
            return List.of(new ValidationError("$", UNAVAILABLE_MESSAGE, ValidationError.Kind.UNAVAILABLE));
        }

        // Thiếu kết quả nghĩa là có đoạn chưa được kiểm tra: không được coi là an toàn.
        if (results.size() != texts.size()) {
            log.error("Số kết quả kiểm duyệt ({}) khác số đoạn văn ({})", results.size(), texts.size());
            return List.of(new ValidationError("$", UNAVAILABLE_MESSAGE, ValidationError.Kind.UNAVAILABLE));
        }

        List<ValidationError> flagged = new ArrayList<>();
        for (int i = 0; i < results.size(); i++) {
            ModerationResult result = results.get(i);
            if (result.flagged()) {
                flagged.add(new ValidationError(texts.get(i).path(),
                        UNSAFE_MESSAGE + " (" + String.join(", ", result.categories()) + ")", ValidationError.Kind.UNSAFE));
            }
        }
        return flagged;
    }
}
