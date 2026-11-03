package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;

import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;

class RagSpikeConfigTest {
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

    @Test
    void allowsNonDefaultPortOnlyForExplicitLoopbackEvaluation() {
        var local = RagSpikeConfig.from(Map.of(
                "DB_URL", "jdbc:postgresql://127.0.0.1:55432/rag_eval",
                "DB_USERNAME", "postgres", "DB_PASSWORD", "local-test-password",
                "RAG_LOCAL_EVAL", "true"));

        assertThatCode(local::requireDatabase).doesNotThrowAnyException();

        var noOptIn = RagSpikeConfig.from(Map.of(
                "DB_URL", "jdbc:postgresql://127.0.0.1:55432/rag_eval",
                "DB_USERNAME", "postgres", "DB_PASSWORD", "local-test-password"));
        assertThatThrownBy(noOptIn::requireDatabase).isInstanceOf(IllegalArgumentException.class);

        var remote = RagSpikeConfig.from(Map.of(
                "DB_URL", "jdbc:postgresql://db.example.supabase.co:55432/postgres",
                "DB_USERNAME", "postgres", "DB_PASSWORD", "local-test-password",
                "RAG_LOCAL_EVAL", "true"));
        assertThatThrownBy(remote::requireDatabase).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void localEvaluationAlsoRequiresTheDedicatedLocalPostgresClusterIdentity() {
        Path expectedDataDirectory = Path.of("target/rag-eval-local/data").toAbsolutePath().normalize();
        assertThatCode(() -> CurriculumSpikeDatabase.requireLocalEvaluationIdentity(
                "rag_eval", "127.0.0.1/32", 55432, expectedDataDirectory.toString(), expectedDataDirectory))
                .doesNotThrowAnyException();
        assertThatCode(() -> CurriculumSpikeDatabase.requireLocalEvaluationIdentity(
                "rag_eval", "::ffff:127.0.0.1/128", 55432, expectedDataDirectory.toString(), expectedDataDirectory))
                .doesNotThrowAnyException();

        assertThatThrownBy(() -> CurriculumSpikeDatabase.requireLocalEvaluationIdentity(
                "postgres", "127.0.0.1", 55432, "/var/lib/postgresql/data", expectedDataDirectory))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> CurriculumSpikeDatabase.requireLocalEvaluationIdentity(
                "rag_eval", "10.0.0.8", 55432, expectedDataDirectory.toString(), expectedDataDirectory))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> CurriculumSpikeDatabase.requireLocalEvaluationIdentity(
                "rag_eval", "127.0.0.1", 5432, expectedDataDirectory.toString(), expectedDataDirectory))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
