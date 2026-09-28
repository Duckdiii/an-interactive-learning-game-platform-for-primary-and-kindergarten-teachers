package com.aigameplatform.backend.service.validation.safety;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class GameTextExtractorTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private static JsonNode example(String file) throws IOException {
        try (InputStream in = GameTextExtractorTest.class.getResourceAsStream("/dsl-examples/" + file + ".json")) {
            return MAPPER.readTree(in);
        }
    }

    @Test
    void extractsReadableTextWithItsPath() throws IOException {
        List<GameTextExtractor.TextEntry> entries = GameTextExtractor.extract(example("quiz"));

        assertThat(entries).contains(
                new GameTextExtractor.TextEntry("$.metadata.title", "Ví dụ QUIZ"),
                new GameTextExtractor.TextEntry("$.questions[0].questionText", "Có mấy con mèo?"),
                new GameTextExtractor.TextEntry("$.questions[0].visualPrompt", "three cats"),
                new GameTextExtractor.TextEntry("$.questions[0].options[1].text", "3"));
    }

    @Test
    void skipsIdsUrlsAndTechnicalValues() throws IOException {
        List<String> texts = GameTextExtractor.extract(example("quiz")).stream().map(GameTextExtractor.TextEntry::text).toList();

        assertThat(texts).doesNotContain("QUIZ", "1.0.0", "MATH", "GRADE_1", "q1", "a", "b", "https://images.example.com/three-cats.jpg");
    }

    @Test
    void skipsScrambledLettersButKeepsTheWord() throws IOException {
        List<GameTextExtractor.TextEntry> entries = GameTextExtractor.extract(example("word-scramble"));

        assertThat(entries).extracting(GameTextExtractor.TextEntry::path)
                .contains("$.questions[0].correctWord")
                .noneMatch(p -> p.contains("scrambledLetters"));
    }

    @Test
    void ignoresNumbersAndBooleans() throws IOException {
        List<GameTextExtractor.TextEntry> entries = GameTextExtractor.extract(example("spot-the-target"));

        assertThat(entries).extracting(GameTextExtractor.TextEntry::path)
                .noneMatch(p -> p.contains("hitRegion") || p.contains("points") || p.contains("timeLimitSeconds"));
    }
}
