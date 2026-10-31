package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.KindergartenAgeBand;
import com.aigameplatform.backend.entity.enums.Subject;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.output.Response;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class CurriculumSpikeTest {
    @Test
    void extractionEvidenceIsIsolatedPerDataset() {
        assertThat(CurriculumSpikeRunner.extractionOutputPath("math-g2-draft"))
                .isEqualTo(java.nio.file.Path.of("target", "curriculum-spike", "extracted", "math-g2-draft"));
        assertThat(CurriculumSpikeRunner.extractionOutputPath("kindergarten"))
                .isNotEqualTo(CurriculumSpikeRunner.extractionOutputPath("math-g2-draft"));
        assertThatThrownBy(() -> CurriculumSpikeRunner.extractionOutputPath("../other"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> CurriculumSpikeRunner.extractionOutputPath(".."))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> CurriculumSpikeRunner.extractionOutputPath("unknown-dataset"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void queryRunnerRejectsGradeThatDoesNotMatchSelectedDataset() {
        assertThatThrownBy(() -> CurriculumSpikeRunner.requireQueryScope(true, GradeLevel.GRADE_1))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("does not match");
        assertThatThrownBy(() -> CurriculumSpikeRunner.requireQueryScope(false, GradeLevel.KINDERGARTEN))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("does not match");
        assertThatCode(() -> CurriculumSpikeRunner.requireQueryScope(true, GradeLevel.KINDERGARTEN))
                .doesNotThrowAnyException();
        assertThatCode(() -> CurriculumSpikeRunner.requireQueryScope(false, GradeLevel.GRADE_1))
                .doesNotThrowAnyException();
    }

    @Test
    void draftDatasetsCanOnlyBeEvaluatedAgainstAnExplicitLoopbackDatabase() {
        assertThatThrownBy(() -> CurriculumSpikeRunner.requireDraftEvaluationAllowed(
                true, "--ingest", RagSpikeConfig.from(java.util.Map.of())))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("extraction-only until reviewed");

        var local = RagSpikeConfig.from(java.util.Map.of(
                "DB_URL", "jdbc:postgresql://127.0.0.1:55432/rag_eval",
                "DB_USERNAME", "postgres", "DB_PASSWORD", "local-only", "RAG_LOCAL_EVAL", "true"));
        assertThatCode(() -> CurriculumSpikeRunner.requireDraftEvaluationAllowed(true, "--ingest", local))
                .doesNotThrowAnyException();

        var remote = RagSpikeConfig.from(java.util.Map.of(
                "DB_URL", "jdbc:postgresql://db.example.supabase.co:55432/postgres",
                "DB_USERNAME", "postgres", "DB_PASSWORD", "local-only", "RAG_LOCAL_EVAL", "true"));
        assertThatThrownBy(() -> CurriculumSpikeRunner.requireDraftEvaluationAllowed(true, "--ingest", remote))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("loopback");
    }

    private static final String MODEL = "test-embedding-model";
    private static final CurriculumSource SOURCE = new CurriculumSource(
            "curriculum.pdf", "a".repeat(64), "32/2018/TT-BGDDT", "fixture-v1", 2);
    private static final CurriculumSource PRESCHOOL_SOURCE = new CurriculumSource(
            "preschool.pdf", "b".repeat(64), "01/VBHN-BGDĐT", "kindergarten-outcomes-v1", 84);

    @Test
    void reviewedCorpusPreservesLimitsAndJoinsTheCrossPageOutcome() throws Exception {
        var dataset = CurriculumDataset.loadDefault();
        assertThat(dataset.chunks()).hasSize(28);
        assertThat(dataset.chunks().stream().filter(c -> !c.control())).hasSize(23);
        assertThat(dataset.chunks().stream().filter(c -> c.chunkId().equals("math-g1-005")))
                .extracting(CurriculumChunk::text)
                .containsExactly("Thực hiện được phép cộng, phép trừ (không nhớ) các số trong phạm vi 100.");
        var crossPage = dataset.chunks().stream().filter(c -> c.chunkId().equals("math-g1-013")).findFirst().orElseThrow();
        assertThat(crossPage.sourceFragments()).extracting(CurriculumChunk.SourceFragment::pdfPage)
                .containsExactly(188, 189);
        assertThat(crossPage.text()).endsWith("sử dụng bộ đồ dùng học tập cá nhân hoặc vật thật.");
        assertThat(CurriculumEvaluation.loadQueries().stream().filter(q -> !q.negative())).hasSize(10);
    }

    @Test
    void vietnameseGradeOneDraftHasOneOutcomePerSourceLinkedChunk() throws Exception {
        var dataset = CurriculumDataset.loadFromResourceRoot("/curriculum/spike/vietnamese-grade1/");

        assertThat(dataset.source().datasetVersion()).isEqualTo("vietnamese-grade1-draft-v1");
        assertThat(dataset.chunks()).hasSize(36).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.VIETNAMESE);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_1);
            assertThat(chunk.control()).isFalse();
            assertThat(chunk.sourceFragments()).isNotEmpty();
        });
        var crossPageReadingOutcome = dataset.chunks().stream()
                .filter(chunk -> chunk.chunkId().equals("vi-g1-007")).findFirst().orElseThrow();
        assertThat(crossPageReadingOutcome.sourceFragments()).extracting(CurriculumChunk.SourceFragment::pdfPage)
                .containsExactly(74, 75);
        var crossPageWritingOutcome = dataset.chunks().stream()
                .filter(chunk -> chunk.chunkId().equals("vi-g1-026")).findFirst().orElseThrow();
        assertThat(crossPageWritingOutcome.sourceFragments()).extracting(CurriculumChunk.SourceFragment::pdfPage)
                .containsExactly(76, 77);
    }

    @Test
    void vietnameseGradeOneDraftCannotBeIngestedBeforeReview() {
        assertThatThrownBy(() -> CurriculumSpikeRunner.run(
                new String[]{"--dataset", "vietnamese-g1-draft", "--ingest"}, java.util.Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("extraction-only until reviewed");
    }

    @Test
    void mathGradeTwoDraftHasOneOutcomePerSourceLinkedChunkAndStaysExtractionOnly() throws Exception {
        var dataset = CurriculumDataset.loadFromResourceRoot("/curriculum/spike/math-grade2/");

        assertThat(dataset.chunks()).hasSize(43).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.MATH);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_2);
            assertThat(chunk.control()).isFalse();
        });
        var capacity = dataset.chunks().stream().filter(c -> c.chunkId().equals("math-g2-029"))
                .findFirst().orElseThrow();
        assertThat(capacity.sourceFragments()).extracting(CurriculumChunk.SourceFragment::pdfPage)
                .containsExactly(192, 193);
        assertThatThrownBy(() -> CurriculumSpikeRunner.run(
                new String[]{"--dataset", "math-g2-draft", "--ingest"}, java.util.Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("extraction-only until reviewed");
    }

    @Test
    void vietnameseGradeTwoDraftPreservesCrossPageOutcomesAndGradeThreeControls() throws Exception {
        var dataset = CurriculumDataset.loadFromResourceRoot("/curriculum/spike/vietnamese-grade2/");

        assertThat(dataset.chunks()).hasSize(44);
        assertThat(dataset.chunks()).filteredOn(chunk -> !chunk.control()).hasSize(42).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.VIETNAMESE);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_2);
            assertThat(chunk.control()).isFalse();
        });
        assertThat(dataset.chunks()).filteredOn(CurriculumChunk::control).hasSize(2).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.VIETNAMESE);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_3);
            assertThat(chunk.sourceFragments()).allSatisfy(fragment -> assertThat(fragment.pdfPage()).isIn(82, 83));
        });
        assertThat(dataset.chunks()).extracting(CurriculumChunk::chunkId).doesNotHaveDuplicates();
        assertThat(dataset.chunks().stream().mapToInt(chunk -> chunk.sourceFragments().size()).sum()).isEqualTo(49);
        assertThat(dataset.chunks()).extracting(CurriculumChunk::chunkId).doesNotHaveDuplicates();
        var crossPage = dataset.chunks().stream().filter(c -> c.chunkId().equals("vi-g2-007"))
                .findFirst().orElseThrow();
        assertThat(crossPage.sourceFragments()).extracting(CurriculumChunk.SourceFragment::pdfPage)
                .containsExactly(78);
        assertThatThrownBy(() -> CurriculumSpikeRunner.run(
                new String[]{"--dataset", "vietnamese-g2-draft", "--ingest"}, java.util.Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("extraction-only until reviewed");
    }

    @Test
    void englishGradeThreeDraftUsesSkillColumnAndRemainsExtractionOnly() throws Exception {
        var dataset = CurriculumDataset.loadFromResourceRoot("/curriculum/spike/english-grade3/");

        assertThat(dataset.chunks()).hasSize(18);
        assertThat(dataset.chunks()).filteredOn(chunk -> !chunk.control()).hasSize(15).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.ENGLISH);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_3);
            assertThat(chunk.sourceFragments()).allSatisfy(fragment -> assertThat(fragment.region()).isEqualTo("SKILLS"));
        });
        assertThat(dataset.chunks()).filteredOn(CurriculumChunk::control).hasSize(3).allSatisfy(chunk -> {
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_4);
            assertThat(chunk.sourceFragments()).allSatisfy(fragment -> assertThat(fragment.region()).isEqualTo("SKILLS_CONTROL"));
        });
        assertThat(dataset.chunks().stream().mapToInt(chunk -> chunk.sourceFragments().size()).sum()).isEqualTo(20);
        assertThatThrownBy(() -> CurriculumSpikeRunner.run(
                new String[]{"--dataset", "english-g3-draft", "--ingest"}, java.util.Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("extraction-only until reviewed");
    }

    @Test
    void englishGradeOneAndTwoDraftsKeepTheirDistinctSourceOutcomesAndControls() throws Exception {
        var gradeOne = CurriculumDataset.loadFromResourceRoot("/curriculum/spike/english-grade1/");
        var gradeTwo = CurriculumDataset.loadFromResourceRoot("/curriculum/spike/english-grade2/");

        assertThat(gradeOne.chunks()).hasSize(13);
        assertThat(gradeOne.chunks()).extracting(CurriculumChunk::chunkId).doesNotHaveDuplicates();
        assertThat(gradeOne.chunks()).filteredOn(chunk -> !chunk.control()).hasSize(6).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.ENGLISH);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_1);
            assertThat(chunk.sourceFragments()).allSatisfy(fragment -> {
                assertThat(fragment.pdfPage()).isIn(1238, 1239);
                assertThat(fragment.printedPage()).isEqualTo(fragment.pdfPage() == 1238 ? 7 : 8);
                assertThat(fragment.region()).isEqualTo("FULL");
            });
        });
        assertThat(gradeOne.chunks()).filteredOn(CurriculumChunk::control).hasSize(7).allSatisfy(chunk -> {
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_2);
            assertThat(chunk.sourceFragments()).allSatisfy(fragment -> {
                assertThat(fragment.pdfPage()).isEqualTo(1239);
                assertThat(fragment.printedPage()).isEqualTo(8);
                assertThat(fragment.region()).isEqualTo("FULL");
            });
        });
        assertThat(gradeOne.chunks().stream().filter(chunk -> !chunk.control())
                .filter(chunk -> Set.of("en-g1-001", "en-g1-002").contains(chunk.chunkId()))
                .flatMap(chunk -> chunk.sourceFragments().stream()).map(CurriculumChunk.SourceFragment::pdfPage))
                .containsOnly(1238);

        assertThat(gradeTwo.chunks()).hasSize(13);
        assertThat(gradeTwo.chunks()).extracting(CurriculumChunk::chunkId).doesNotHaveDuplicates();
        assertThat(gradeTwo.chunks()).filteredOn(chunk -> !chunk.control()).hasSize(7).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.ENGLISH);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_2);
            assertThat(chunk.sourceFragments()).allSatisfy(fragment -> {
                assertThat(fragment.pdfPage()).isEqualTo(1239);
                assertThat(fragment.printedPage()).isEqualTo(8);
                assertThat(fragment.region()).isEqualTo("FULL");
            });
        });
        assertThat(gradeTwo.chunks()).filteredOn(CurriculumChunk::control).hasSize(6).allSatisfy(chunk -> {
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_1);
            assertThat(chunk.sourceFragments()).allSatisfy(fragment -> {
                assertThat(fragment.pdfPage()).isIn(1238, 1239);
                assertThat(fragment.printedPage()).isEqualTo(fragment.pdfPage() == 1238 ? 7 : 8);
                assertThat(fragment.region()).isEqualTo("FULL");
            });
        });
        assertThat(java.util.stream.Stream.concat(
                gradeOne.chunks().stream().filter(chunk -> !chunk.control()),
                gradeTwo.chunks().stream().filter(chunk -> !chunk.control()))
                .map(chunk -> CurriculumChunk.normalize(chunk.text())))
                .doesNotHaveDuplicates();
        assertThatThrownBy(() -> CurriculumSpikeRunner.run(
                new String[]{"--dataset", "english-g1-draft", "--ingest"}, java.util.Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("extraction-only until reviewed");
        assertThatThrownBy(() -> CurriculumSpikeRunner.run(
                new String[]{"--dataset", "english-g2-draft", "--ingest"}, java.util.Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("extraction-only until reviewed");
    }

    @Test
    void englishGradeFourDraftUsesGradeScopedSkillBandsAndRemainsExtractionOnly() throws Exception {
        var dataset = CurriculumDataset.loadFromResourceRoot("/curriculum/spike/english-grade4/");

        assertThat(dataset.source().datasetVersion()).isEqualTo("english-grade4-draft-v1");
        assertThat(dataset.chunks()).filteredOn(CurriculumChunk::control).hasSize(3).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.ENGLISH);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_3);
            assertThat(chunk.sourceFragments()).allSatisfy(fragment -> {
                assertThat(fragment.pdfPage()).isEqualTo(1277);
                assertThat(fragment.region()).isEqualTo("SKILLS_G3");
            });
        });
        assertThat(dataset.chunks()).filteredOn(chunk -> !chunk.control()).hasSize(14).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.ENGLISH);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_4);
            assertThat(chunk.sourceFragments()).isNotEmpty();
        });
        assertThat(dataset.chunks()).extracting(CurriculumChunk::chunkId).doesNotHaveDuplicates();
        assertThat(dataset.chunks().stream().mapToInt(chunk -> chunk.sourceFragments().size()).sum()).isEqualTo(19);
        assertThatThrownBy(() -> CurriculumSpikeRunner.run(
                new String[]{"--dataset", "english-g4-draft", "--ingest"}, java.util.Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("extraction-only until reviewed");
    }

    @Test
    void englishGradeFiveDraftUsesGradeScopedSkillBandsAndRemainsExtractionOnly() throws Exception {
        var dataset = CurriculumDataset.loadFromResourceRoot("/curriculum/spike/english-grade5/");

        assertThat(dataset.source().datasetVersion()).isEqualTo("english-grade5-draft-v1");
        assertThat(dataset.chunks()).filteredOn(CurriculumChunk::control).hasSize(2).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.ENGLISH);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_4);
            assertThat(chunk.sourceFragments()).allSatisfy(fragment -> {
                assertThat(fragment.pdfPage()).isIn(1278, 1279);
                assertThat(fragment.region()).isEqualTo("SKILLS_G4");
            });
        });
        assertThat(dataset.chunks()).filteredOn(chunk -> !chunk.control()).hasSize(15).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.ENGLISH);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_5);
            assertThat(chunk.sourceFragments()).allSatisfy(fragment -> assertThat(fragment.region()).isEqualTo("SKILLS_G5"));
        });
        assertThat(dataset.manualTranscriptions()).hasSize(1)
                .extracting(CurriculumDataset.ManualTranscription::chunkId).containsExactly("en-g5-012");
        assertThat(dataset.chunks()).extracting(CurriculumChunk::chunkId).doesNotHaveDuplicates();
        assertThat(dataset.chunks().stream().mapToInt(chunk -> chunk.sourceFragments().size()).sum()).isEqualTo(18);
        assertThatThrownBy(() -> CurriculumSpikeRunner.run(
                new String[]{"--dataset", "english-g5-draft", "--ingest"}, java.util.Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("extraction-only until reviewed");
    }

    @Test
    void mathGradeThreeDraftHasOneOutcomePerSourceLinkedChunkAndStaysExtractionOnly() throws Exception {
        var dataset = CurriculumDataset.loadFromResourceRoot("/curriculum/spike/math-grade3/");

        assertThat(dataset.source().datasetVersion()).isEqualTo("math-grade3-draft-v1");
        assertThat(dataset.chunks()).hasSize(51).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.MATH);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_3);
            assertThat(chunk.control()).isFalse();
            assertThat(chunk.sourceFragments()).isNotEmpty();
        });
        assertThat(dataset.chunks()).extracting(CurriculumChunk::chunkId).doesNotHaveDuplicates();
        assertThat(dataset.manualTranscriptions()).hasSize(2);
        assertThatThrownBy(() -> CurriculumSpikeRunner.run(
                new String[]{"--dataset", "math-g3-draft", "--ingest"}, java.util.Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("extraction-only until reviewed");
    }

    @Test
    void mathGradeFourDraftHasOneOutcomePerSourceLinkedChunkAndStaysExtractionOnly() throws Exception {
        var dataset = CurriculumDataset.loadFromResourceRoot("/curriculum/spike/math-grade4/");

        assertThat(dataset.source().datasetVersion()).isEqualTo("math-grade4-draft-v1");
        assertThat(dataset.chunks()).hasSize(53).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.MATH);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_4);
            assertThat(chunk.control()).isFalse();
        });
        assertThat(dataset.chunks()).extracting(CurriculumChunk::chunkId).doesNotHaveDuplicates();
        assertThat(dataset.chunks().stream().mapToInt(chunk -> chunk.sourceFragments().size()).sum()).isEqualTo(57);
        assertThat(dataset.chunks().stream().filter(chunk -> chunk.sourceFragments().size() > 1))
                .extracting(CurriculumChunk::chunkId)
                .containsExactly("math-g4-006", "math-g4-027", "math-g4-036", "math-g4-046");
        assertThatThrownBy(() -> CurriculumSpikeRunner.run(
                new String[]{"--dataset", "math-g4-draft", "--ingest"}, java.util.Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("extraction-only until reviewed");
    }

    @Test
    void mathGradeFiveDraftHasOneOutcomePerSourceLinkedChunkAndStaysExtractionOnly() throws Exception {
        var dataset = CurriculumDataset.loadFromResourceRoot("/curriculum/spike/math-grade5/");

        assertThat(dataset.source().datasetVersion()).isEqualTo("math-grade5-draft-v1");
        assertThat(dataset.chunks()).hasSize(53).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.MATH);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_5);
            assertThat(chunk.control()).isFalse();
        });
        assertThat(dataset.chunks()).extracting(CurriculumChunk::chunkId).doesNotHaveDuplicates();
        assertThat(dataset.chunks().stream().mapToInt(chunk -> chunk.sourceFragments().size()).sum()).isEqualTo(56);
        assertThat(dataset.chunks().stream().filter(chunk -> chunk.sourceFragments().size() > 1))
                .extracting(CurriculumChunk::chunkId)
                .containsExactly("math-g5-004", "math-g5-025", "math-g5-035");
        assertThat(dataset.manualTranscriptions()).hasSize(1).extracting(CurriculumDataset.ManualTranscription::chunkId)
                .containsExactly("math-g5-053");
        assertThatThrownBy(() -> CurriculumSpikeRunner.run(
                new String[]{"--dataset", "math-g5-draft", "--ingest"}, java.util.Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("extraction-only until reviewed");
    }

    @Test
    void vietnameseGradeThreeDraftHasSourceLinkedOutcomesAndSamePageGradeFourControls() throws Exception {
        var dataset = CurriculumDataset.loadFromResourceRoot("/curriculum/spike/vietnamese-grade3/");

        assertThat(dataset.source().datasetVersion()).isEqualTo("vietnamese-grade3-draft-v1");
        assertThat(dataset.chunks()).filteredOn(CurriculumChunk::control).hasSize(2).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.VIETNAMESE);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_4);
            assertThat(chunk.sourceFragments()).allSatisfy(fragment -> assertThat(fragment.pdfPage()).isEqualTo(87));
        });
        assertThat(dataset.chunks()).filteredOn(chunk -> !chunk.control()).hasSize(45).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.VIETNAMESE);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_3);
            assertThat(chunk.sourceFragments()).isNotEmpty();
        });
        assertThat(dataset.chunks()).extracting(CurriculumChunk::chunkId).doesNotHaveDuplicates();
        assertThat(dataset.chunks().stream().mapToInt(chunk -> chunk.sourceFragments().size()).sum()).isEqualTo(50);
        assertThatThrownBy(() -> CurriculumSpikeRunner.run(
                new String[]{"--dataset", "vietnamese-g3-draft", "--ingest"}, java.util.Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("extraction-only until reviewed");
    }

    @Test
    void vietnameseGradeFourDraftHasSourceLinkedOutcomesAndSamePageGradeThreeControls() throws Exception {
        var dataset = CurriculumDataset.loadFromResourceRoot("/curriculum/spike/vietnamese-grade4/");

        assertThat(dataset.source().datasetVersion()).isEqualTo("vietnamese-grade4-draft-v1");
        assertThat(dataset.chunks()).filteredOn(CurriculumChunk::control).hasSize(2).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.VIETNAMESE);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_3);
            assertThat(chunk.sourceFragments()).allSatisfy(fragment -> assertThat(fragment.pdfPage()).isEqualTo(87));
        });
        assertThat(dataset.chunks()).filteredOn(chunk -> !chunk.control()).hasSize(42).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.VIETNAMESE);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_4);
            assertThat(chunk.sourceFragments()).isNotEmpty();
        });
        assertThat(dataset.chunks()).extracting(CurriculumChunk::chunkId).doesNotHaveDuplicates();
        assertThat(dataset.chunks().stream().mapToInt(chunk -> chunk.sourceFragments().size()).sum()).isEqualTo(45);
        assertThatThrownBy(() -> CurriculumSpikeRunner.run(
                new String[]{"--dataset", "vietnamese-g4-draft", "--ingest"}, java.util.Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("extraction-only until reviewed");
    }

    @Test
    void vietnameseGradeFiveDraftHasSourceLinkedOutcomesAndSamePageGradeFourControls() throws Exception {
        var dataset = CurriculumDataset.loadFromResourceRoot("/curriculum/spike/vietnamese-grade5/");

        assertThat(dataset.source().datasetVersion()).isEqualTo("vietnamese-grade5-draft-v1");
        assertThat(dataset.chunks()).filteredOn(CurriculumChunk::control).hasSize(2).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.VIETNAMESE);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_4);
            assertThat(chunk.sourceFragments()).allSatisfy(fragment -> assertThat(fragment.pdfPage()).isEqualTo(91));
        });
        assertThat(dataset.chunks()).filteredOn(chunk -> !chunk.control()).hasSize(40).allSatisfy(chunk -> {
            assertThat(chunk.subject()).isEqualTo(Subject.VIETNAMESE);
            assertThat(chunk.gradeLevel()).isEqualTo(GradeLevel.GRADE_5);
            assertThat(chunk.sourceFragments()).isNotEmpty();
        });
        assertThat(dataset.chunks()).extracting(CurriculumChunk::chunkId).doesNotHaveDuplicates();
        assertThat(dataset.chunks().stream().mapToInt(chunk -> chunk.sourceFragments().size()).sum()).isEqualTo(45);
        assertThatThrownBy(() -> CurriculumSpikeRunner.run(
                new String[]{"--dataset", "vietnamese-g5-draft", "--ingest"}, java.util.Map.of()))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("extraction-only until reviewed");
    }

    @Test
    void manifestProvenanceMustCoverEveryChunkSourceFragment() throws Exception {
        var manifest = new tools.jackson.databind.json.JsonMapper().readTree("""
                {"pdfPages":[1275],"printedPages":[26,27],"region":"SKILLS",
                 "pageMap":[{"pdfPage":1275,"printedPage":26}]}
                """);
        var chunk = new CurriculumChunk("en-test", Subject.ENGLISH, GradeLevel.GRADE_3, "English / Listening",
                "One outcome.", false,
                List.of(new CurriculumChunk.SourceFragment(1275, 27, "SKILLS", "One outcome.")));

        assertThatThrownBy(() -> CurriculumDataset.validateManifestProvenance(manifest, List.of(chunk)))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("printed-page mapping");
    }

    @Test
    void manifestMustDeclareEveryManualTranscription() throws Exception {
        var manifest = new tools.jackson.databind.json.JsonMapper().readTree("""
                {"manualTranscriptions":[]}
                """);
        var transcription = new CurriculumDataset.ManualTranscription(
                "math-g3-022", 197, 31, "RIGHT", "Outcome with 1/2.");

        assertThatThrownBy(() -> CurriculumDataset.validateManualTranscriptionDeclarations(
                manifest, List.of(transcription)))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("manifest declaration");
    }

    @Test
    void chunkRejectsBrokenTranscriptionInsteadOfEmbeddingIt() {
        assertThatThrownBy(() -> new CurriculumChunk("bad", Subject.MATH, GradeLevel.GRADE_1,
                "addition", "Unverified text", false,
                List.of(new CurriculumChunk.SourceFragment(1, 1, "RIGHT", "Different source text"))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void kindergartenChunkCarriesAgeAndCurriculumDomainOutsideTheSubjectHint() {
        var outcome = "Đếm trên các đối tượng giống nhau và đếm đến 5.";
        var chunk = new CurriculumChunk("kg-count-34", Subject.MATH, GradeLevel.KINDERGARTEN,
                "Nhận thức / Làm quen với một số khái niệm sơ đẳng về toán / Số lượng",
                outcome, false, List.of(new CurriculumChunk.SourceFragment(62, 74, "AGE_3_4", outcome)),
                "COGNITIVE", List.of("MATHEMATICAL_CONCEPTS", "NUMBER_AND_QUANTITY"), "AGE_3_4");

        var segment = chunk.toSegment(SOURCE, MODEL);

        assertThat(segment.metadata().getString("gradeLevel")).isEqualTo("KINDERGARTEN");
        assertThat(segment.metadata().getString("subject")).isEqualTo("MATH");
        assertThat(segment.metadata().getString("domain")).isEqualTo("COGNITIVE");
        assertThat(segment.metadata().getString("subDomain"))
                .isEqualTo("MATHEMATICAL_CONCEPTS|NUMBER_AND_QUANTITY");
        assertThat(segment.metadata().getString("ageBand")).isEqualTo("AGE_3_4");
        assertThat(segment.text()).contains("Lĩnh vực: COGNITIVE", "Độ tuổi: AGE_3_4", outcome);
    }

    @Test
    void kindergartenChunkCannotOmitItsAgeBandOrUseAnExcludedDomain() {
        String outcome = "Nhận biết chữ cái trong một số từ quen thuộc.";
        var fragment = List.of(new CurriculumChunk.SourceFragment(68, 80, "AGE_3_4", outcome));
        assertThatThrownBy(() -> new CurriculumChunk("kg-lang-34", Subject.VIETNAMESE, GradeLevel.KINDERGARTEN,
                "Ngôn ngữ / Nghe, nói", outcome, false, fragment, "LANGUAGE", List.of("LISTENING"), null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new CurriculumChunk("kg-art-34", Subject.MATH, GradeLevel.KINDERGARTEN,
                "Thẩm mỹ", outcome, false, fragment, "AESTHETIC", List.of("ART"), "AGE_3_4"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void kindergartenRetrievalFiltersToRequestedAgeBeforeRanking() {
        var store = new InMemoryEmbeddingStore<TextSegment>();
        var count34 = kindergartenChunk("kg-count-34", Subject.MATH, "COGNITIVE", "MATHEMATICAL_CONCEPTS",
                "AGE_3_4", false, "Count up to five objects.");
        var count45 = kindergartenChunk("kg-count-45", Subject.MATH, "COGNITIVE", "MATHEMATICAL_CONCEPTS",
                "AGE_4_5", false, "Count up to ten objects.");
        var language56 = kindergartenChunk("kg-language-56", Subject.VIETNAMESE, "LANGUAGE", "SPEAKING",
                "AGE_5_6", false, "Retell a familiar story.");
        var control = kindergartenChunk("kg-control", Subject.MATH, "COGNITIVE", "MATHEMATICAL_CONCEPTS",
                "AGE_4_5", true, "Control outcome.");
        var excluded = kindergartenChunk("kg-excluded", Subject.MATH, "COGNITIVE", "SCIENCE",
                "AGE_4_5", false, "Excluded physical outcome.");
        store.add(Embedding.from(new float[]{0.8f, 0.6f}), count34.toSegment(PRESCHOOL_SOURCE, MODEL));
        for (var candidate : List.of(count45, language56, control))
            store.add(Embedding.from(new float[]{1, 0}), candidate.toSegment(PRESCHOOL_SOURCE, MODEL));
        var excludedSegment = excluded.toSegment(PRESCHOOL_SOURCE, MODEL);
        excludedSegment.metadata().put("domain", "PHYSICAL");
        store.add(Embedding.from(new float[]{1, 0}), excludedSegment);
        var service = new CurriculumRAGService(store, model(new float[]{1, 0}), SOURCE, MODEL, 3, 0.99);

        var result = service.retrieveKindergarten("sort animals by habitat", Subject.MATH,
                PRESCHOOL_SOURCE, KindergartenAgeBand.AGE_3_4, 8, 0.50);

        assertThat(result.chunks()).extracting(CurriculumRAGService.RetrievedChunk::chunkId)
                .containsExactly("kg-count-34");
        assertThat(result.chunks()).extracting(CurriculumRAGService.RetrievedChunk::ageBand)
                .containsExactly("AGE_3_4");
        assertThat(result.curriculumContext()).doesNotContain("AGE_5_6");
    }

    @Test
    void defaultKindergartenThresholdRejectsWeakOffScopeMatchAndKeepsItAsSuggestion() throws Exception {
        var store = new InMemoryEmbeddingStore<TextSegment>();
        var count = kindergartenChunk("kg-count-34", Subject.MATH, "COGNITIVE", "MATHEMATICAL_CONCEPTS",
                "AGE_3_4", false, "Count up to five objects.");
        store.add(Embedding.from(new float[]{0.6f, 0.8f}), count.toSegment(PRESCHOOL_SOURCE, MODEL));
        var service = new CurriculumRAGService(store, model(new float[]{1, 0}), SOURCE, MODEL, 3, 0.99);
        var setting = CurriculumSpikeRunner.class.getDeclaredMethod("kindergartenMinScore", java.util.Map.class);
        setting.setAccessible(true);
        double minScore = (double) setting.invoke(null, java.util.Map.of());

        var result = service.retrieveKindergarten("four digit division", Subject.MATH,
                PRESCHOOL_SOURCE, KindergartenAgeBand.AGE_3_4, 8, minScore);

        assertThat(result.status()).isEqualTo(CurriculumRAGService.Status.INSUFFICIENT_EVIDENCE);
        assertThat(result.chunks()).isEmpty();
        assertThat(result.suggestions()).extracting(CurriculumRAGService.RetrievedChunk::chunkId)
                .containsExactly("kg-count-34");
    }

    @Test
    void filtersSubjectAndGradeBeforeRankingEvenWhenControlsAreCloser() {
        var store = new InMemoryEmbeddingStore<TextSegment>();
        put(store, chunk("right", Subject.MATH, GradeLevel.GRADE_1, false), new float[]{0.8f, 0.6f});
        put(store, chunk("wrong-grade", Subject.MATH, GradeLevel.GRADE_2, false), new float[]{1, 0});
        put(store, chunk("wrong-subject", Subject.VIETNAMESE, GradeLevel.GRADE_1, false), new float[]{1, 0});
        var service = new CurriculumRAGService(store, model(new float[]{1, 0}), SOURCE, MODEL, 3, 0.7);

        var result = service.retrieve("addition", Subject.MATH, GradeLevel.GRADE_1);

        assertThat(result.status()).isEqualTo(CurriculumRAGService.Status.FOUND);
        assertThat(result.chunks()).extracting(CurriculumRAGService.RetrievedChunk::chunkId).containsExactly("right");
        assertThat(result.curriculumContext()).doesNotContain("AGE_5_6");
    }

    @Test
    void doesNotReturnAnOldDatasetOrDifferentEmbeddingModel() {
        var store = new InMemoryEmbeddingStore<TextSegment>();
        var segment = chunk("old", Subject.MATH, GradeLevel.GRADE_1, false).toSegment(SOURCE, MODEL);
        segment.metadata().put("datasetVersion", "fixture-v0");
        store.add(Embedding.from(new float[]{1, 0}), segment);
        var wrongModel = chunk("other", Subject.MATH, GradeLevel.GRADE_1, false).toSegment(SOURCE, "other-model");
        store.add(Embedding.from(new float[]{1, 0}), wrongModel);

        var result = new CurriculumRAGService(store, model(new float[]{1, 0}), SOURCE, MODEL, 3, 0.7)
                .retrieve("addition", Subject.MATH, GradeLevel.GRADE_1);

        assertThat(result.status()).isEqualTo(CurriculumRAGService.Status.INSUFFICIENT_EVIDENCE);
        assertThat(result.curriculumContext()).isEmpty();
    }

    @Test
    void lowScoreReturnsInsufficientEvidenceAndMissingScopeIsRejected() {
        var store = new InMemoryEmbeddingStore<TextSegment>();
        put(store, chunk("low", Subject.MATH, GradeLevel.GRADE_1, false), new float[]{-1, 0});
        var service = new CurriculumRAGService(store, model(new float[]{1, 0}), SOURCE, MODEL, 3, 0.75);
        assertThat(service.retrieve("unknown", Subject.MATH, GradeLevel.GRADE_1).chunks()).isEmpty();
        assertThatThrownBy(() -> service.retrieve("addition", null, GradeLevel.GRADE_1))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.retrieve(" ", Subject.MATH, GradeLevel.GRADE_1))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void repeatedIngestionUsesStableIdsAndSkipsExistingChunks() {
        var store = new InMemoryEmbeddingStore<TextSegment>();
        var dataset = new CurriculumDataset(SOURCE, List.of(chunk("one", Subject.MATH, GradeLevel.GRADE_1, false)));
        var ingestor = new CurriculumIngestor(store, model(new float[]{1, 0}), MODEL, 2);
        var first = ingestor.ingest(dataset, Set.of());
        var second = ingestor.ingest(dataset, Set.copyOf(first.embeddingIds()));
        assertThat(first.written()).isEqualTo(1);
        assertThat(second.written()).isZero();
        assertThat(second.skipped()).isEqualTo(1);
        assertThat(second.embeddingIds()).containsExactlyElementsOf(first.embeddingIds());
        assertThat(store.size()).isEqualTo(1);
    }

    @Test
    void controlsAreExcludedEvenInTheirOwnScopeAndMissingLabelsFailClosed() {
        var store = new InMemoryEmbeddingStore<TextSegment>();
        put(store, chunk("control", Subject.MATH, GradeLevel.GRADE_2, true), new float[]{1, 0});
        var unlabeled = chunk("unlabeled", Subject.MATH, GradeLevel.GRADE_2, false).toSegment(SOURCE, MODEL);
        unlabeled.metadata().remove("control");
        store.add(Embedding.from(new float[]{1, 0}), unlabeled);
        var service = new CurriculumRAGService(store, model(new float[]{1, 0}), SOURCE, MODEL, 1, 0.7);

        assertThat(service.retrieve("addition", Subject.MATH, GradeLevel.GRADE_2).chunks()).isEmpty();
        put(store, chunk("real", Subject.MATH, GradeLevel.GRADE_2, false), new float[]{0.8f, 0.6f});
        assertThat(service.retrieve("addition", Subject.MATH, GradeLevel.GRADE_2).chunks())
                .extracting(CurriculumRAGService.RetrievedChunk::chunkId).containsExactly("real");
    }

    @Test
    void ingestionCheckpointsValidatedBatchesAndResumesAfterProviderFailure() {
        var store = new InMemoryEmbeddingStore<TextSegment>();
        var chunks = java.util.stream.IntStream.range(0, 65)
                .mapToObj(i -> chunk("chunk-" + i, Subject.MATH, GradeLevel.GRADE_1, false)).toList();
        var dataset = new CurriculumDataset(SOURCE, chunks);
        var calls = new java.util.concurrent.atomic.AtomicInteger();
        EmbeddingModel provider = new EmbeddingModel() {
            @Override
            public Response<List<Embedding>> embedAll(List<TextSegment> segments) {
                if (segments.size() > 32) throw new IllegalStateException("Provider batch limit exceeded");
                if (calls.incrementAndGet() == 2) throw new IllegalStateException("Temporary provider failure");
                return Response.from(segments.stream().map(s -> Embedding.from(new float[]{3, 4})).toList());
            }
        };
        assertThatThrownBy(() -> new CurriculumIngestor(store, provider, MODEL, 2).ingest(dataset, Set.of()))
                .isInstanceOf(IllegalStateException.class).hasMessage("Temporary provider failure");
        assertThat(store.size()).isEqualTo(32);
        var existing = chunks.subList(0, 32).stream().map(c -> c.embeddingId(SOURCE, MODEL, 2))
                .collect(java.util.stream.Collectors.toSet());

        var result = new CurriculumIngestor(store, provider, MODEL, 2).ingest(dataset, existing);
        assertThat(result.written()).isEqualTo(33);
        assertThat(result.skipped()).isEqualTo(32);
        assertThat(store.size()).isEqualTo(65);
        var matches = store.search(dev.langchain4j.store.embedding.EmbeddingSearchRequest.builder()
                .queryEmbedding(Embedding.from(new float[]{1, 0})).maxResults(65).build()).matches();
        assertThat(matches).hasSize(65).allSatisfy(match ->
                assertThat(match.embedding().vector()).containsExactly(0.6f, 0.8f));
    }

    @Test
    void dimensionMismatchStopsBeforeAnyWrite() {
        var store = new InMemoryEmbeddingStore<TextSegment>();
        var dataset = new CurriculumDataset(SOURCE, List.of(chunk("one", Subject.MATH, GradeLevel.GRADE_1, false)));
        assertThatThrownBy(() -> new CurriculumIngestor(store, model(new float[]{1, 0}), MODEL, 768)
                .ingest(dataset, Set.of())).isInstanceOf(IllegalStateException.class);
        assertThat(store.size()).isZero();
    }

    @Test
    void evaluationCountsQueriesWithARelevantTopThreeResultAndDetectsLeakage() {
        var query = new CurriculumEvaluation.EvaluationQuery("q", "addition", List.of("right"), false);
        var result = new CurriculumRAGService.RetrievalResult(CurriculumRAGService.Status.FOUND,
                List.of(hit("irrelevant", Subject.MATH, GradeLevel.GRADE_1),
                        hit("right", Subject.MATH, GradeLevel.GRADE_1)));
        var row = CurriculumEvaluation.score(query, result, 5);
        assertThat(row.hit()).isTrue();
        var rows = java.util.stream.IntStream.range(0, 10).mapToObj(i -> CurriculumEvaluation.score(
                new CurriculumEvaluation.EvaluationQuery("q" + i, "addition", List.of("right"), false),
                i < 8 ? result : new CurriculumRAGService.RetrievalResult(
                        CurriculumRAGService.Status.INSUFFICIENT_EVIDENCE, List.of()), 5)).toList();
        assertThat(CurriculumEvaluation.summarize(rows).hitAt3()).isEqualTo(0.8);
        assertThat(CurriculumEvaluation.summarize(rows).retrievalGatePassed()).isTrue();
        var leak = CurriculumEvaluation.score(query, new CurriculumRAGService.RetrievalResult(
                CurriculumRAGService.Status.FOUND, List.of(hit("right", Subject.MATH, GradeLevel.GRADE_2))), 5);
        assertThat(CurriculumEvaluation.summarize(List.of(leak)).retrievalGatePassed()).isFalse();
    }

    @Test
    void metadataCorrectionsChangeIdentityInsteadOfBeingSilentlySkipped() {
        var original = chunk("one", Subject.MATH, GradeLevel.GRADE_1, false);
        var correctedGrade = chunk("one", Subject.MATH, GradeLevel.GRADE_2, false);
        assertThat(correctedGrade.embeddingId(SOURCE, MODEL, 768))
                .isNotEqualTo(original.embeddingId(SOURCE, MODEL, 768));
        var correctedVersion = new CurriculumSource("curriculum.pdf", "a".repeat(64), "new-curriculum", "fixture-v1", 2);
        assertThat(original.embeddingId(correctedVersion, MODEL, 768))
                .isNotEqualTo(original.embeddingId(SOURCE, MODEL, 768));
        var correctedPage = new CurriculumChunk("one", Subject.MATH, GradeLevel.GRADE_1, "addition", "Outcome one", false,
                List.of(new CurriculumChunk.SourceFragment(2, 2, "RIGHT", "Outcome one")));
        assertThat(correctedPage.embeddingId(SOURCE, MODEL, 768))
                .isNotEqualTo(original.embeddingId(SOURCE, MODEL, 768));
    }

    @Test
    void controlGateRequiresStoredControlsToBeExcludedInBothScopes() {
        var control = chunk("control", Subject.MATH, GradeLevel.GRADE_2, true);
        var empty = new CurriculumRAGService.RetrievalResult(CurriculumRAGService.Status.INSUFFICIENT_EVIDENCE, List.of());
        var ownLeak = new CurriculumRAGService.RetrievalResult(CurriculumRAGService.Status.FOUND,
                List.of(hit("control", Subject.MATH, GradeLevel.GRADE_2)));
        // A different control labeled with the primary scope must also count as leakage.
        var primaryLeak = new CurriculumRAGService.RetrievalResult(CurriculumRAGService.Status.FOUND,
                List.of(hit("another-control", Subject.MATH, GradeLevel.GRADE_1)));
        var ids = Set.of("control", "another-control");
        var passed = CurriculumEvaluation.scoreControl(control, ids, empty, empty);
        assertThat(passed.passed()).isTrue();
        assertThat(CurriculumEvaluation.scoreControl(control, ids, ownLeak, empty).passed()).isFalse();
        assertThat(CurriculumEvaluation.scoreControl(control, ids, empty, primaryLeak).passed()).isFalse();
        assertThat(CurriculumEvaluation.scoreControl(control, ids, empty, primaryLeak).primaryScopeLeakage()).isEqualTo(1);
    }

    @Test
    void negativeGateRequiresAllThreeQueriesAndRejectsDuplicateQueryIds() {
        var empty = new CurriculumRAGService.RetrievalResult(CurriculumRAGService.Status.INSUFFICIENT_EVIDENCE, List.of());
        var oneNegative = CurriculumEvaluation.score(
                new CurriculumEvaluation.EvaluationQuery("n1", "unknown", List.of(), true), empty, 5);
        assertThat(CurriculumEvaluation.summarize(List.of(oneNegative)).negativeGatePassed()).isFalse();
        assertThat(CurriculumEvaluation.summarize(List.of(oneNegative, oneNegative, oneNegative)).negativeGatePassed()).isFalse();
    }

    private static CurriculumChunk chunk(String id, Subject subject, GradeLevel grade, boolean control) {
        return new CurriculumChunk(id, subject, grade, "addition", "Outcome " + id, control,
                List.of(new CurriculumChunk.SourceFragment(1, 1, "RIGHT", "Outcome " + id)));
    }

    private static CurriculumChunk kindergartenChunk(String id, Subject subject, String domain, String subDomain,
                                                       String ageBand, boolean control, String text) {
        int printedPage = 73;
        int pdfPage = 61;
        return new CurriculumChunk(id, subject, GradeLevel.KINDERGARTEN, domain + " / " + subDomain,
                text, control, List.of(new CurriculumChunk.SourceFragment(pdfPage, printedPage, ageBand, text)),
                domain, List.of(subDomain), ageBand);
    }

    private static void put(InMemoryEmbeddingStore<TextSegment> store, CurriculumChunk chunk, float[] vector) {
        store.add(Embedding.from(vector), chunk.toSegment(SOURCE, MODEL));
    }

    private static EmbeddingModel model(float[] vector) {
        return new EmbeddingModel() {
            @Override
            public Response<List<Embedding>> embedAll(List<TextSegment> segments) {
                return Response.from(segments.stream().map(s -> Embedding.from(vector.clone())).toList());
            }
        };
    }

    private static CurriculumRAGService.RetrievedChunk hit(String id, Subject subject, GradeLevel grade) {
        return new CurriculumRAGService.RetrievedChunk(id, subject, grade, "addition", "Outcome " + id,
                0.9, "curriculum.pdf", List.of(1), List.of(1), "32/2018/TT-BGDDT");
    }
}
