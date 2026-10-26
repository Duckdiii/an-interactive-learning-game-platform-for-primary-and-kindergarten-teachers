package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;

import com.aigameplatform.backend.entity.enums.GradeLevel;
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
    private static final String MODEL = "test-embedding-model";
    private static final CurriculumSource SOURCE = new CurriculumSource(
            "curriculum.pdf", "a".repeat(64), "32/2018/TT-BGDDT", "fixture-v1", 2);

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
    void chunkRejectsBrokenTranscriptionInsteadOfEmbeddingIt() {
        assertThatThrownBy(() -> new CurriculumChunk("bad", Subject.MATH, GradeLevel.GRADE_1,
                "addition", "Unverified text", false,
                List.of(new CurriculumChunk.SourceFragment(1, 1, "RIGHT", "Different source text"))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void filtersSubjectAndGradeBeforeRankingEvenWhenControlsAreCloser() {
        var store = new InMemoryEmbeddingStore<TextSegment>();
        put(store, chunk("right", Subject.MATH, GradeLevel.GRADE_1, false), new float[]{0.8f, 0.6f});
        put(store, chunk("wrong-grade", Subject.MATH, GradeLevel.GRADE_2, true), new float[]{1, 0});
        put(store, chunk("wrong-subject", Subject.VIETNAMESE, GradeLevel.GRADE_1, true), new float[]{1, 0});
        var service = new CurriculumRAGService(store, model(new float[]{1, 0}), SOURCE, MODEL, 3, 0.7);

        var result = service.retrieve("addition", Subject.MATH, GradeLevel.GRADE_1);

        assertThat(result.status()).isEqualTo(CurriculumRAGService.Status.FOUND);
        assertThat(result.chunks()).extracting(CurriculumRAGService.RetrievedChunk::chunkId).containsExactly("right");
        assertThat(result.curriculumContext()).contains("curriculum.pdf", "PDF 1", "Outcome right");
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
