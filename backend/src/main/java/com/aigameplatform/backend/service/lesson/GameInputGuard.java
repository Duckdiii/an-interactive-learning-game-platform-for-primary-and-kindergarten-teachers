package com.aigameplatform.backend.service.lesson;

import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import com.aigameplatform.backend.service.validation.safety.ContentModerationClient;
import com.aigameplatform.backend.service.validation.safety.ModerationResult;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class GameInputGuard {
    private static final Logger log = LoggerFactory.getLogger(GameInputGuard.class);
    private static final int CHUNK_SIZE = 8_000;
    private static final int CHUNK_OVERLAP = 256;
    private static final Pattern INJECTION = Pattern.compile(
            "(?:ignore|forget|disregard)\\s+(?:all\\s+)?(?:previous|prior|above)\\s+(?:instructions?|rules?)"
            + "|(?:reveal|print|show|output)\\s+(?:the\\s+)?(?:system|developer)\\s+(?:prompt|message|instructions?)"
            + "|(?:bỏ qua|phớt lờ)\\s+(?:(?:tất cả|mọi)\\s+)?(?:chỉ dẫn|hướng dẫn|quy tắc)\\s+(?:trước đó|ở trên|ban đầu)"
            + "|(?:in|tiết lộ|hiện)\\s+(?:ra\\s+)?(?:system prompt|chỉ dẫn hệ thống|prompt hệ thống)",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    private final BlockedWordList blockedWords;
    private final ContentModerationClient moderation;
    private final boolean moderationRequired;

    public GameInputGuard(BlockedWordList blockedWords, ContentModerationClient moderation) {
        this(blockedWords, moderation, true);
    }

    @Autowired
    public GameInputGuard(
            BlockedWordList blockedWords,
            ContentModerationClient moderation,
            @Value("${app.moderation.required:true}") boolean moderationRequired) {
        this.blockedWords = blockedWords;
        this.moderation = moderation;
        this.moderationRequired = moderationRequired;
    }

    public void requireSafe(String idea, String lessonText, String... additionalInputs) {
        var sources = new ArrayList<String>();
        if (idea != null && !idea.isBlank()) sources.add(idea);
        if (lessonText != null && !lessonText.isBlank()) sources.add(lessonText);
        if (additionalInputs != null) {
            for (String input : additionalInputs) if (input != null && !input.isBlank()) sources.add(input);
        }
        if (sources.isEmpty()) return;

        for (String source : sources) {
            String normalized = Normalizer.normalize(source, Normalizer.Form.NFC);
            if (blockedWords.findIn(normalized).isPresent() || INJECTION.matcher(normalized).find())
                throw new ApiException(ErrorCode.UNSAFE_CONTENT, "Nội dung mô tả hoặc tài liệu chưa đạt chuẩn an toàn dành cho học sinh.");
        }
        if (!moderationRequired) return;
        if (!moderation.isConfigured()) throw unavailable();

        List<String> chunks = sources.stream().flatMap(source -> chunks(source).stream()).toList();
        try {
            List<ModerationResult> results = moderation.moderate(chunks);
            if (results == null || results.size() != chunks.size() || results.stream().anyMatch(java.util.Objects::isNull))
                throw unavailable();
            if (results.stream().anyMatch(ModerationResult::flagged))
                throw new ApiException(ErrorCode.UNSAFE_CONTENT, "Nội dung mô tả hoặc tài liệu chưa đạt chuẩn an toàn dành cho học sinh.");
        } catch (ApiException e) {
            throw e;
        } catch (RuntimeException e) {
            Throwable diagnostic = e.getCause() == null ? e : e.getCause();
            log.warn("Input safety moderation unavailable ({})", diagnostic.getClass().getSimpleName());
            throw unavailable();
        }
    }

    private static List<String> chunks(String source) {
        var result = new ArrayList<String>();
        for (int start = 0; start < source.length();) {
            int end = Math.min(source.length(), start + CHUNK_SIZE);
            result.add(source.substring(start, end));
            if (end == source.length()) break;
            start = end - CHUNK_OVERLAP;
        }
        return result;
    }

    private static ApiException unavailable() {
        return new ApiException(ErrorCode.INPUT_SAFETY_UNAVAILABLE,
                "Hệ thống chưa kiểm tra được độ an toàn của nội dung. Vui lòng thử lại sau ít phút.");
    }
}
