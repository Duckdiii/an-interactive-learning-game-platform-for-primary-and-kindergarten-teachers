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

class CurriculumRAGServiceTest {
    @Test
    void selectedSourceFiltersAndExcludesControlsForEveryPackagedDataset() throws Exception {
        var datasets = CurriculumDataset.loadPackaged();
        var store = new InMemoryEmbeddingStore<TextSegment>();
        for (var dataset : datasets) {
            for (var chunk : dataset.chunks())
                store.add(Embedding.from(new float[]{1, 0}), chunk.toSegment(dataset.source(), "fixture"));
        }
        EmbeddingModel queryModel = new EmbeddingModel() {
            @Override public Response<List<Embedding>> embedAll(List<TextSegment> segments) {
                return Response.from(segments.stream().map(ignored -> Embedding.from(new float[]{1, 0})).toList());
            }
        };
        var service = new CurriculumRAGService(store, queryModel, datasets.getFirst().source(), "fixture", 3, .855);

        assertThat(datasets).hasSize(16);
        for (var dataset : datasets) {
            var first = dataset.chunks().stream().filter(chunk -> !chunk.control()).findFirst().orElseThrow();
            if (first.gradeLevel() == GradeLevel.KINDERGARTEN) {
                for (var age : com.aigameplatform.backend.entity.enums.KindergartenAgeBand.values()) {
                    var expected = dataset.chunks().stream().filter(chunk -> !chunk.control())
                            .filter(chunk -> age.metadataValue().equals(chunk.ageBand()))
                            .filter(chunk -> "COGNITIVE".equals(chunk.domain()) || "LANGUAGE".equals(chunk.domain()))
                            .map(CurriculumChunk::chunkId).toList();
                    var result = service.retrieveKindergarten("natural teacher request", Subject.MATH,
                            dataset.source(), age, expected.size(), 0.0);
                    assertThat(result.chunks()).as(dataset.source().datasetVersion() + "/" + age)
                            .extracting(CurriculumRAGService.RetrievedChunk::chunkId)
                            .containsExactlyInAnyOrderElementsOf(expected);
                    assertThat(result.chunks()).allSatisfy(candidate ->
                            assertThat(candidate.ageBand()).isEqualTo(age.metadataValue()));
                }
            } else {
                int expectedOutcomes = (int) dataset.chunks().stream().filter(chunk -> !chunk.control()).count();
                var result = service.retrieve("natural teacher request", first.subject(), first.gradeLevel(),
                        dataset.source(), expectedOutcomes, 0.0);
                assertThat(result.chunks()).as(dataset.source().datasetVersion()).hasSize(expectedOutcomes);
                assertThat(result.chunks()).extracting(CurriculumRAGService.RetrievedChunk::chunkId)
                        .containsExactlyInAnyOrderElementsOf(dataset.chunks().stream().filter(chunk -> !chunk.control())
                                .map(CurriculumChunk::chunkId).toList());
                assertThat(result.chunks()).allSatisfy(candidate -> {
                    assertThat(candidate.subject()).isEqualTo(first.subject());
                    assertThat(candidate.gradeLevel()).isEqualTo(first.gradeLevel());
                });
            }
        }
    }

    @Test
    void selectedSourceAndMetadataFiltersExcludeControlsAndRowsFromOtherVersions() {
        var selectedSource = source("vi-g2-v1", "a");
        var otherSource = source("vi-g2-v0", "b");
        var primary = chunk("vi-g2-001", selectedSource, false, "Nghe hiểu lời nói đơn giản.");
        var control = chunk("vi-g2-ctrl-001", selectedSource, true, "Outcome from the neighbouring grade.");
        var stale = chunk("vi-g2-old-001", otherSource, false, "Stale version outcome.");
        var store = new InMemoryEmbeddingStore<TextSegment>();
        for (var chunk : List.of(primary, control, stale))
            store.add(Embedding.from(new float[]{1, 0}), chunk.toSegment(chunk == stale ? otherSource : selectedSource, "fixture"));
        EmbeddingModel queryModel = new EmbeddingModel() {
            @Override public Response<List<Embedding>> embedAll(List<TextSegment> segments) {
                return Response.from(segments.stream().map(ignored -> Embedding.from(new float[]{1, 0})).toList());
            }
        };
        var service = new CurriculumRAGService(store, queryModel, source("math-g1-default", "c"), "fixture", 3, .855);

        var result = service.retrieve("thực hành nghe hiểu", Subject.VIETNAMESE, GradeLevel.GRADE_2,
                selectedSource, 3, 0.0);

        assertThat(result.chunks()).extracting(CurriculumRAGService.RetrievedChunk::chunkId)
                .containsExactly("vi-g2-001");
        assertThat(result.chunks()).allSatisfy(candidate -> {
            assertThat(candidate.subject()).isEqualTo(Subject.VIETNAMESE);
            assertThat(candidate.gradeLevel()).isEqualTo(GradeLevel.GRADE_2);
        });
    }

    private static CurriculumSource source(String version, String hashPrefix) {
        return new CurriculumSource(version + ".pdf", hashPrefix.repeat(64), "32/2018/TT-BGDDT", version, 1555);
    }

    private static CurriculumChunk chunk(String id, CurriculumSource source, boolean control, String text) {
        return new CurriculumChunk(id, Subject.VIETNAMESE, GradeLevel.GRADE_2, "Nghe", text, control,
                List.of(new CurriculumChunk.SourceFragment(78, 5, "FULL", text)));
    }
}
