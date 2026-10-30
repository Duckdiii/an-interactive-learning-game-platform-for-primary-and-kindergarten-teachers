package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;
import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.exception.*;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.output.Response;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;

class VerifiedCurriculumContextProviderTest {
    @Test void candidatesMustPassVerificationAndContextOnlyContainsSupportedChunks() throws Exception {
        var dataset = CurriculumDataset.loadDefault();
        var constraints = CurriculumConstraints.load(dataset);
        var store = new InMemoryEmbeddingStore<TextSegment>();
        dataset.chunks().stream().filter(c -> Set.of("math-g1-001", "math-g1-005").contains(c.chunkId()))
                .forEach(c -> store.add(Embedding.from(new float[]{1, 0}), c.toSegment(dataset.source(), "fixture")));
        var failing = new AtomicBoolean();
        EmbeddingModel model = new EmbeddingModel() {
            public Response<List<Embedding>> embedAll(List<TextSegment> segments) {
                if (failing.get()) throw new IllegalStateException("SECRET_TOPIC");
                return Response.from(segments.stream().map(s -> Embedding.from(new float[]{1, 0})).toList());
            }
        };
        var service = new CurriculumRAGService(store, model, dataset.source(), "fixture", 3, 0.8);
        var provider = new VerifiedCurriculumContextProvider(new CurriculumCatalog(List.of(dataset), Set.of(GameType.QUIZ)),
                new CurriculumAvailability(Clock.systemUTC(), Duration.ofSeconds(30), d -> {}), () -> service,
                () -> constraints, constraints.sha256());
        assertThat(provider.retrieve("Đếm từ 1 đến 5", Subject.MATH, GradeLevel.GRADE_1).context())
                .contains("math-g1-001", "PDF").doesNotContain("math-g1-005");
        assertThatThrownBy(() -> provider.retrieve("Cộng trong phạm vi 1000", Subject.MATH, GradeLevel.GRADE_1))
                .isInstanceOf(CurriculumEvidenceNotFoundException.class).hasMessageContaining("phạm vi");
        assertThatThrownBy(() -> provider.retrieve("Không đếm", Subject.MATH, GradeLevel.GRADE_1))
                .isInstanceOf(CurriculumEvidenceNotFoundException.class).hasMessageContaining("làm rõ");
        failing.set(true);
        assertThatThrownBy(() -> provider.retrieve("Đếm từ 1 đến 5", Subject.MATH, GradeLevel.GRADE_1))
                .isInstanceOf(CurriculumServiceUnavailableException.class).hasMessageNotContaining("SECRET_TOPIC");
        assertThatThrownBy(() -> provider.retrieve("Đếm", Subject.MATH, GradeLevel.KINDERGARTEN))
                .isInstanceOf(GenerationScopeUnsupportedException.class);
    }

    @Test void unapprovedConstraintsBlockBeforeQueryEmbedding() throws Exception {
        var dataset = CurriculumDataset.loadDefault();
        var provider = new VerifiedCurriculumContextProvider(new CurriculumCatalog(List.of(dataset), Set.of(GameType.QUIZ)),
                new CurriculumAvailability(Clock.systemUTC(), Duration.ofSeconds(30), d -> {}),
                () -> { throw new AssertionError("Must not query before constraint approval"); },
                () -> { try { return CurriculumConstraints.load(dataset); } catch (Exception e) { throw new IllegalStateException(e); } }, "");
        assertThatThrownBy(() -> provider.retrieve("Đếm", Subject.MATH, GradeLevel.GRADE_1))
                .isInstanceOf(CurriculumServiceUnavailableException.class);
    }
}
