package com.aigameplatform.backend.service.validation.safety;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

/**
 * Danh sách từ cấm học đường, đọc từ file văn bản (mỗi dòng một từ hoặc cụm từ, dòng bắt đầu bằng # là chú
 * thích). Đổi vị trí file bằng {@code app.moderation.blocked-words-location} để sửa mà không cần build lại.
 * Khớp theo ranh giới từ và giữ nguyên dấu tiếng Việt nên "cứt" bị chặn nhưng "cứu" thì không.
 * Hỗ trợ nạp lại bộ nhớ lúc chạy (hot-reload runtime) thông qua reload().
 */
@Component
public class BlockedWordList {

    private final AtomicReference<List<Term>> termsRef = new AtomicReference<>(List.of());
    private final AtomicReference<List<String>> rawWordsRef = new AtomicReference<>(List.of());

    @Autowired
    public BlockedWordList(@Value("${app.moderation.blocked-words-location}") Resource resource) {
        this(read(resource));
    }

    public BlockedWordList(List<String> words) {
        reload(words);
    }

    public void reload(List<String> words) {
        if (words == null) {
            words = List.of();
        }
        List<String> cleanedWords = words.stream()
                .map(String::strip)
                .filter(w -> !w.isEmpty() && !w.startsWith("#"))
                .distinct()
                .toList();
        this.rawWordsRef.set(cleanedWords);

        List<Term> compiledTerms = cleanedWords.stream()
                .map(BlockedWordList::normalize)
                .distinct()
                .map(Term::new)
                .toList();
        this.termsRef.set(compiledTerms);
    }

    public List<String> getWords() {
        return rawWordsRef.get();
    }

    /** @return từ cấm đầu tiên xuất hiện trong văn bản, nếu có */
    public Optional<String> findIn(String text) {
        if (text == null || text.isBlank()) {
            return Optional.empty();
        }
        String normalized = normalize(text);
        return termsRef.get().stream().filter(t -> t.pattern.matcher(normalized).find()).map(t -> t.word).findFirst();
    }

    private static String normalize(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFC).toLowerCase(Locale.ROOT);
    }

    private static List<String> read(Resource resource) {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            return reader.lines().collect(Collectors.toList());
        } catch (IOException e) {
            throw new UncheckedIOException("Không đọc được danh sách từ cấm: " + resource, e);
        }
    }

    private static final class Term {
        private final String word;
        private final Pattern pattern;

        private Term(String word) {
            this.word = word;
            String body = List.of(word.split("\\s+")).stream().map(Pattern::quote).collect(Collectors.joining("\\s+"));
            this.pattern = Pattern.compile("(?<![\\p{L}\\p{N}])" + body + "(?![\\p{L}\\p{N}])");
        }
    }
}
