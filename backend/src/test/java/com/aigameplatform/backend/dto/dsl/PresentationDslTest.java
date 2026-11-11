package com.aigameplatform.backend.dto.dsl;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class PresentationDslTest {

    @Test
    void keepsKnownValuesCaseInsensitivelyAndDropsUnknownOnes() {
        assertThat(PresentationDsl.normalize(" Ocean ", "fish", "orbit")).isEqualTo(new PresentationDsl("ocean", "fish", null));
        assertThat(PresentationDsl.normalize("mars", "rocket", null)).isNull();
        assertThat(PresentationDsl.normalize(null, null, null)).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"quiz", "matching", "memory-card", "odd-one-out", "drag-drop", "ordering", "word-scramble",
            "visual-cloze", "audio-visual-match", "spot-the-target"})
    void theJavaListsMatchTheEnumsOfEveryDslSchema(String type) throws IOException {
        try (InputStream in = getClass().getResourceAsStream("/schema/game-dsl/1.0.0/" + type + ".schema.json")) {
            JsonNode presentation = JsonMapper.builder().build().readTree(in)
                    .path("properties").path("metadata").path("properties").path("presentation").path("properties");

            assertThat(values(presentation.path("world").path("enum"))).isEqualTo(PresentationDsl.WORLDS);
            assertThat(values(presentation.path("carrier").path("enum"))).isEqualTo(PresentationDsl.CARRIERS);
            assertThat(values(presentation.path("layout").path("enum"))).isEqualTo(PresentationDsl.LAYOUTS);
        }
    }

    private static List<String> values(JsonNode array) {
        return array.valueStream().map(JsonNode::asString).toList();
    }
}
