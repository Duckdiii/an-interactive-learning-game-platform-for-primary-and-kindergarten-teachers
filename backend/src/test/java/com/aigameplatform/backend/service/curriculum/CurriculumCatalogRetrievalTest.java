package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.output.Response;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;
import java.util.List;
import org.junit.jupiter.api.Test;

class CurriculumCatalogRetrievalTest {
    private static final String MODEL_NAME = "test-embedding-model";

    @Test
    void selectsTheActiveDatasetForTheRequestedSubjectAndGradeBeforeVectorRanking() {
        var math = dataset("math.pdf", "a", "math-g1-v1", Subject.MATH, "Math outcome");
        var vietnamese = dataset("vietnamese.pdf", "b", "vietnamese-g1-v1", Subject.VIETNAMESE,
                "Vietnamese outcome");
        var store = new InMemoryEmbeddingStore<TextSegment>();
        add(store, math.chunks().getFirst(), math.source(), 0.95f);
        add(store, vietnamese.chunks().getFirst(), vietnamese.source(), 0.8f);
        var catalog = new CurriculumDatasetCatalog(List.of(math, vietnamese));
        var retriever = new CurriculumRAGService(store, queryModel(), catalog, MODEL_NAME, 3, 0.7);

        var result = retriever.retrieve("language", Subject.VIETNAMESE, GradeLevel.GRADE_1);

        assertThat(result.status()).isEqualTo(CurriculumRAGService.Status.FOUND);
        assertThat(result.chunks()).extracting(CurriculumRAGService.RetrievedChunk::text)
                .containsExactly("Vietnamese outcome");
        assertThat(result.curriculumContext()).contains("vietnamese.pdf", "Vietnamese outcome");
        assertThat(result.evidenceSupports()).singleElement().satisfies(support -> {
            assertThat(support.chunkId()).isEqualTo(vietnamese.chunks().getFirst().chunkId());
            assertThat(support.outcomeText()).isEqualTo(vietnamese.chunks().getFirst().text());
            assertThat(support.requestedCondition()).isEqualTo("language");
        });
    }

    @Test
    void distinguishesAnUnconfiguredCurriculumScopeFromAnEmptyQueryResult() {
        var math = dataset("math.pdf", "a", "math-g1-v1", Subject.MATH, "Math outcome");
        var store = new InMemoryEmbeddingStore<TextSegment>();
        add(store, math.chunks().getFirst(), math.source(), 0.9f);
        var retriever = new CurriculumRAGService(store, queryModel(),
                new CurriculumDatasetCatalog(List.of(math)), MODEL_NAME, 3, 0.7);

        var result = retriever.retrieve("english", Subject.ENGLISH, GradeLevel.GRADE_1);

        assertThat(result.status()).isEqualTo(CurriculumRAGService.Status.UNSUPPORTED_SCOPE);
        assertThat(result.chunks()).isEmpty();
    }

    @Test
    void semanticallyCloseButConstraintConflictingCandidatesAreNotPassedAsCurriculumContext() {
        var math = dataset("math.pdf", "a", "math-g1-v1", Subject.MATH,
                "Thực hiện được phép cộng, phép trừ không nhớ các số trong phạm vi 100.");
        var store = new InMemoryEmbeddingStore<TextSegment>();
        add(store, math.chunks().getFirst(), math.source(), 0.95f);
        var retriever = new CurriculumRAGService(store, queryModel(),
                new CurriculumDatasetCatalog(List.of(math)), MODEL_NAME, 3, 0.7);

        var result = retriever.retrieve("Cộng có nhớ các số trong phạm vi 100", Subject.MATH, GradeLevel.GRADE_1);

        assertThat(result.status()).isEqualTo(CurriculumRAGService.Status.INSUFFICIENT_EVIDENCE);
        assertThat(result.reasonCode()).isEqualTo("UNSUPPORTED_EXPLICIT_CONSTRAINT");
        assertThat(result.candidates()).hasSize(1);
        assertThat(result.chunks()).isEmpty();
        assertThat(result.curriculumContext()).isEmpty();
    }

    @Test
    void doesNotPassUnverifiedNeighboringOutcomesIntoGenerationContext() {
        var math = new CurriculumSource("math.pdf", "a".repeat(64), "32/2018/TT-BGDDT", "math-g1-v1", 2);
        var noCarry = new CurriculumChunk("math-g1-v1", Subject.MATH, GradeLevel.GRADE_1, "addition",
                "Thực hiện phép cộng không nhớ các số trong phạm vi 100.", false,
                List.of(new CurriculumChunk.SourceFragment(1, 1, "RIGHT",
                        "Thực hiện phép cộng không nhớ các số trong phạm vi 100.")));
        var carryWithinTen = new CurriculumChunk("math-g1-v1", Subject.MATH, GradeLevel.GRADE_1, "addition",
                "Thực hiện phép cộng có nhớ trong phạm vi 10.", false,
                List.of(new CurriculumChunk.SourceFragment(1, 1, "RIGHT",
                        "Thực hiện phép cộng có nhớ trong phạm vi 10.")));
        var store = new InMemoryEmbeddingStore<TextSegment>();
        add(store, noCarry, math, 0.95f);
        add(store, carryWithinTen, math, 0.94f);
        var retriever = new CurriculumRAGService(store, queryModel(), math, MODEL_NAME, 3, 0.7);

        var result = retriever.retrieve("Cộng có nhớ trong phạm vi 100", Subject.MATH, GradeLevel.GRADE_1);

        assertThat(result.status()).isEqualTo(CurriculumRAGService.Status.INSUFFICIENT_EVIDENCE);
        assertThat(result.candidates()).hasSize(2);
        assertThat(result.chunks()).isEmpty();
        assertThat(result.curriculumContext()).isEmpty();
    }

    @Test
    void scopeAndVersionFiltersAreRequiredForAllFifteenReviewedCurriculumScopes() throws Exception {
        var datasets = CurriculumDataset.loadAllReviewed();
        var catalog = new CurriculumDatasetCatalog(datasets);
        var store = new InMemoryEmbeddingStore<TextSegment>();
        for (var dataset : datasets) {
            var firstOutcome = dataset.chunks().stream().filter(chunk -> !chunk.control()).findFirst().orElseThrow();
            add(store, firstOutcome, dataset.source(), 0.95f);
        }
        var retriever = new CurriculumRAGService(store, queryModel(), catalog, MODEL_NAME, 3, 0.7);

        for (var dataset : datasets) {
            var firstOutcome = dataset.chunks().stream().filter(chunk -> !chunk.control()).findFirst().orElseThrow();
            var supported = retriever.retrieve(firstOutcome.topic(), firstOutcome.subject(), firstOutcome.gradeLevel());
            assertThat(supported.status()).as("supported %s/%s", firstOutcome.subject(), firstOutcome.gradeLevel())
                    .isEqualTo(CurriculumRAGService.Status.FOUND);
            assertThat(supported.chunks()).extracting(CurriculumRAGService.RetrievedChunk::chunkId)
                    .contains(firstOutcome.chunkId());
            assertThat(supported.chunks()).allSatisfy(chunk -> {
                assertThat(chunk.subject()).isEqualTo(firstOutcome.subject());
                assertThat(chunk.gradeLevel()).isEqualTo(firstOutcome.gradeLevel());
                assertThat(chunk.curriculumVersion()).isEqualTo(dataset.source().curriculumVersion());
            });

            var outOfScope = retriever.retrieve("Yêu cầu của lớp kế tiếp ngoài lớp đang chọn",
                    firstOutcome.subject(), firstOutcome.gradeLevel());
            assertThat(outOfScope.status()).as("out-of-scope %s/%s", firstOutcome.subject(), firstOutcome.gradeLevel())
                    .isEqualTo(CurriculumRAGService.Status.INSUFFICIENT_EVIDENCE);
            assertThat(outOfScope.reasonCode()).isEqualTo("REQUESTED_SCOPE_MISMATCH");
            assertThat(outOfScope.curriculumContext()).isEmpty();
        }
    }

    @Test
    void excludesChunksWithAnyWrongCurriculumVersionSourceHashModelOrContentType() {
        var math = dataset("math.pdf", "a", "math-g1-v1", Subject.MATH, "Math outcome");
        var store = new InMemoryEmbeddingStore<TextSegment>();
        for (var change : List.of(
                new String[]{"datasetVersion", "math-g1-v0"},
                new String[]{"curriculumVersion", "31/2018/TT-BGDDT"},
                new String[]{"sourceSha256", "b".repeat(64)},
                new String[]{"embeddingModel", "different-model"},
                new String[]{"control", "true"},
                new String[]{"contentType", "control"})) {
            var segment = math.chunks().getFirst().toSegment(math.source(), MODEL_NAME);
            segment.metadata().put(change[0], change[1]);
            store.add(Embedding.from(new float[]{1, 0}), segment);
        }
        var result = new CurriculumRAGService(store, queryModel(), math.source(), MODEL_NAME, 3, 0.7)
                .retrieve("language", Subject.MATH, GradeLevel.GRADE_1);

        assertThat(result.status()).isEqualTo(CurriculumRAGService.Status.INSUFFICIENT_EVIDENCE);
        assertThat(result.candidates()).isEmpty();
        assertThat(result.curriculumContext()).isEmpty();
    }

    private static CurriculumDataset dataset(String document, String hashPrefix, String version,
                                             Subject subject, String text) {
        var source = new CurriculumSource(document, hashPrefix.repeat(64), "32/2018/TT-BGDĐT", version, 2);
        var chunk = new CurriculumChunk(version, subject, GradeLevel.GRADE_1, "topic", text, false,
                List.of(new CurriculumChunk.SourceFragment(1, 1, "RIGHT", text)));
        return new CurriculumDataset(source, List.of(chunk));
    }

    private static void add(InMemoryEmbeddingStore<TextSegment> store, CurriculumChunk chunk,
                            CurriculumSource source, float score) {
        store.add(Embedding.from(new float[]{score, (float) Math.sqrt(1 - score * score)}),
                chunk.toSegment(source, MODEL_NAME));
    }

    private static EmbeddingModel queryModel() {
        return new EmbeddingModel() {
            @Override
            public Response<List<Embedding>> embedAll(List<TextSegment> segments) {
                return Response.from(segments.stream()
                        .map(ignored -> Embedding.from(new float[]{1, 0})).toList());
            }
        };
    }
}
