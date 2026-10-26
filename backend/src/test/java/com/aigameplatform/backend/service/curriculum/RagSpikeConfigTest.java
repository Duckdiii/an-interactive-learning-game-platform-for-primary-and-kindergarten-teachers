package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;

import java.util.Map;
import org.junit.jupiter.api.Test;

class RagSpikeConfigTest {
    @Test
    void keepsTopKAtThreeByDefaultAndAcceptsBoundedCalibrationValues() {
        assertThat(RagSpikeConfig.from(Map.of()).topK()).isEqualTo(3);
        assertThat(RagSpikeConfig.from(Map.of("CURRICULUM_RAG_TOP_K", "5")).topK()).isEqualTo(5);
        assertThatThrownBy(() -> RagSpikeConfig.from(Map.of("CURRICULUM_RAG_TOP_K", "0")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> RagSpikeConfig.from(Map.of("CURRICULUM_RAG_TOP_K", "51")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void reportsMissingConfigurationWithoutPrintingSecretValues() {
        var config = RagSpikeConfig.from(Map.of("GEMINI_API_KEY", "private-test-key"));
        assertThat(config.safeStatus().toString()).doesNotContain("private-test-key");
        assertThat(config.safeStatus()).containsEntry("GEMINI_API_KEY", true).containsEntry("DB_URL", false);
        assertThatThrownBy(config::requireDatabase).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void rejectsTransactionPoolerAndInvalidSimilarityThreshold() {
        var config = RagSpikeConfig.from(Map.of("DB_URL", "jdbc:postgresql://db.example.supabase.co:6543/postgres",
                "DB_USERNAME", "postgres", "DB_PASSWORD", "private-test-password"));
        assertThatThrownBy(config::requireDatabase).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> RagSpikeConfig.from(Map.of("RAG_MIN_SCORE", "NaN")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> RagSpikeConfig.from(Map.of("RAG_MIN_SCORE", "1.1")))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
