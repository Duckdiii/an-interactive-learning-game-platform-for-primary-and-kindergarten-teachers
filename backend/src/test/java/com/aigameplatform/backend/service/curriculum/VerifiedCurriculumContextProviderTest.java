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
    @Test void nonPilotPrimaryUsesItsOwnSourceAndSemanticVerifierInsteadOfMathOneConstraints() {
        var source = new CurriculumSource("program.pdf", "c".repeat(64), "32/2018/TT-BGDDT", "vi-grade2-v1", 1555);
        var text = "Nghe, hiểu và thực hiện được yêu cầu đơn giản.";
        var chunk = new CurriculumChunk("vi-g2-003", Subject.VIETNAMESE, GradeLevel.GRADE_2,
                "Nghe và nói", text, false, List.of(new CurriculumChunk.SourceFragment(78, 5, "FULL", text)));
        var distractorText = "Viết đúng chính tả các tiếng đã học.";
        var distractor = new CurriculumChunk("vi-g2-004", Subject.VIETNAMESE, GradeLevel.GRADE_2,
                "Viết", distractorText, false, List.of(new CurriculumChunk.SourceFragment(78, 5, "FULL", distractorText)));
        var dataset = new CurriculumDataset(source, List.of(chunk, distractor));
        var store = new InMemoryEmbeddingStore<TextSegment>();
        store.add(Embedding.from(new float[]{0, 1}), chunk.toSegment(source, "fixture"));
        store.add(Embedding.from(new float[]{1, 0}), distractor.toSegment(source, "fixture"));
        EmbeddingModel model = new EmbeddingModel() {
            @Override public Response<List<Embedding>> embedAll(List<TextSegment> segments) {
                return Response.from(segments.stream().map(ignored -> Embedding.from(new float[]{1, 0})).toList());
            }
        };
        var defaultSource = new CurriculumSource("other.pdf", "d".repeat(64), "32/2018/TT-BGDDT", "math-g1-v1", 1555);
        var retriever = new CurriculumRAGService(store, model, defaultSource, "fixture", 3, .855);
        var provider = new VerifiedCurriculumContextProvider(new CurriculumCatalog(List.of(dataset), Set.of(GameType.QUIZ)),
                new CurriculumAvailability(Clock.systemUTC(), Duration.ofSeconds(30), ignored -> {}), () -> retriever,
                () -> { throw new AssertionError("Math Grade 1 sidecar must not be loaded for Vietnamese Grade 2"); }, "",
                CurriculumMetrics.noop(), "fixture", 8, .84, () -> null,
                () -> (topic, subject, grade, age, candidates) -> {
                    assertThat(candidates).extracting(CurriculumRAGService.RetrievedChunk::chunkId)
                            .containsExactly("vi-g2-004", "vi-g2-003");
                    return new SemanticCurriculumEvidenceVerifier.Decision(
                            SemanticCurriculumEvidenceVerifier.Status.SUPPORTED, "DIRECT_SUPPORT", List.of("vi-g2-003"));
                });

        var evidence = provider.retrieve("Cho bé thực hành nghe và làm theo hướng dẫn", Subject.VIETNAMESE,
                GradeLevel.GRADE_2);

        assertThat(evidence.context()).contains("vi-g2-003", "PDF 78", "trang in 5", "32/2018/TT-BGDDT");
        assertThat(evidence.evidence().datasetVersion()).isEqualTo("vi-grade2-v1");
    }

    @Test void nonPilotDistinguishesClarificationFromMissingEvidence() {
        var source = new CurriculumSource("program.pdf", "e".repeat(64), "32/2018/TT-BGDDT", "en-grade1-v1", 1555);
        var text = "Recognize familiar words and simple classroom instructions.";
        var chunk = new CurriculumChunk("en-g1-001", Subject.ENGLISH, GradeLevel.GRADE_1,
                "Listening", text, false, List.of(new CurriculumChunk.SourceFragment(1238, 7, "FULL", text)));
        var dataset = new CurriculumDataset(source, List.of(chunk));
        var store = new InMemoryEmbeddingStore<TextSegment>();
        store.add(Embedding.from(new float[]{1, 0}), chunk.toSegment(source, "fixture"));
        EmbeddingModel model = new EmbeddingModel() {
            @Override public Response<List<Embedding>> embedAll(List<TextSegment> segments) {
                return Response.from(segments.stream().map(ignored -> Embedding.from(new float[]{1, 0})).toList());
            }
        };
        var retriever = new CurriculumRAGService(store, model, source, "fixture", 3, .855);
        var provider = new VerifiedCurriculumContextProvider(new CurriculumCatalog(List.of(dataset), Set.of(GameType.QUIZ)),
                new CurriculumAvailability(Clock.systemUTC(), Duration.ofSeconds(30), ignored -> {}), () -> retriever,
                () -> null, "", CurriculumMetrics.noop(), "fixture", 8, .84, () -> null,
                () -> (topic, subject, grade, age, candidates) -> new SemanticCurriculumEvidenceVerifier.Decision(
                        SemanticCurriculumEvidenceVerifier.Status.NEEDS_CLARIFICATION, "MISSING_ACTIVITY", List.of()));

        assertThatThrownBy(() -> provider.retrieve("Ôn tập tiếng Anh", Subject.ENGLISH, GradeLevel.GRADE_1))
                .isInstanceOf(CurriculumClarificationRequiredException.class);
    }

    @Test void kindergartenAgeFilterPrecedesSemanticVerificationEvenWhenAnotherAgeHasHigherScore() {
        var source = new CurriculumSource("preschool.pdf", "f".repeat(64), "01/VBHN-BGDĐT-2021",
                "kindergarten-outcomes-v1", 84);
        var ageThreeText = "Đếm được số lượng trong phạm vi nhỏ.";
        var ageFourText = "Đếm và nhận biết số lượng trong phạm vi lớn hơn.";
        var ageThree = new CurriculumChunk("kg-count-34", Subject.MATH, GradeLevel.KINDERGARTEN,
                "Nhận thức / Làm quen với toán", ageThreeText, false,
                List.of(new CurriculumChunk.SourceFragment(62, 74, "AGE_3_4", ageThreeText)), "COGNITIVE",
                List.of("MATHEMATICAL_CONCEPTS"), "AGE_3_4");
        var ageFour = new CurriculumChunk("kg-count-45", Subject.MATH, GradeLevel.KINDERGARTEN,
                "Nhận thức / Làm quen với toán", ageFourText, false,
                List.of(new CurriculumChunk.SourceFragment(63, 75, "AGE_4_5", ageFourText)), "COGNITIVE",
                List.of("MATHEMATICAL_CONCEPTS"), "AGE_4_5");
        var dataset = new CurriculumDataset(source, List.of(ageThree, ageFour));
        var store = new InMemoryEmbeddingStore<TextSegment>();
        store.add(Embedding.from(new float[]{0, 1}), ageThree.toSegment(source, "fixture"));
        store.add(Embedding.from(new float[]{1, 0}), ageFour.toSegment(source, "fixture"));
        EmbeddingModel model = new EmbeddingModel() {
            @Override public Response<List<Embedding>> embedAll(List<TextSegment> segments) {
                return Response.from(segments.stream().map(ignored -> Embedding.from(new float[]{1, 0})).toList());
            }
        };
        var retriever = new CurriculumRAGService(store, model, source, "fixture", 3, .855);
        var provider = new VerifiedCurriculumContextProvider(new CurriculumCatalog(List.of(dataset), Set.of(GameType.QUIZ)),
                new CurriculumAvailability(Clock.systemUTC(), Duration.ofSeconds(30), ignored -> {}), () -> retriever,
                () -> null, "", CurriculumMetrics.noop(), "fixture", 8, .84, () -> null,
                () -> (topic, subject, grade, ageBand, candidates) -> {
                    assertThat(ageBand).isEqualTo(KindergartenAgeBand.AGE_3_4);
                    assertThat(candidates).extracting(CurriculumRAGService.RetrievedChunk::chunkId)
                            .containsExactly("kg-count-34");
                    return new SemanticCurriculumEvidenceVerifier.Decision(
                            SemanticCurriculumEvidenceVerifier.Status.SUPPORTED, "AGE_MATCH", List.of("kg-count-34"));
                });

        var result = provider.retrieve("Đếm đồ vật", Subject.VIETNAMESE, GradeLevel.KINDERGARTEN,
                KindergartenAgeBand.AGE_3_4);

        assertThat(result.evidence().chunks()).extracting(CurriculumRAGService.RetrievedChunk::ageBand)
                .containsExactly("AGE_3_4");
        assertThat(result.context()).contains("3–4 tuổi").doesNotContain("4–5 tuổi");
    }
    @Test void providerWithoutAgeAwareImplementationFailsClosedForKindergarten() {
        var called = new AtomicBoolean();
        CurriculumContextProvider provider = (topic, subject, grade) -> {
            called.set(true);
            return CurriculumContextProvider.Evidence.found("unfiltered context");
        };

        assertThatThrownBy(() -> provider.retrieve("count", Subject.MATH, GradeLevel.KINDERGARTEN,
                KindergartenAgeBand.AGE_3_4))
                .isInstanceOf(CurriculumServiceUnavailableException.class)
                .hasMessageContaining("does not support age-filtered");
        assertThat(called).isFalse();
    }

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
                .isInstanceOf(KindergartenAgeBandRequiredException.class);
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

    @Test void kindergartenDoesNotLoadElementaryConstraintsAndIncludesAgeInEvidence() {
        var source = new CurriculumSource("preschool.pdf", "b".repeat(64), "01/VBHN-BGDĐT",
                "kindergarten-outcomes-v1", 84);
        var text = "Đếm trên các đối tượng giống nhau và đếm đến 5.";
        var chunk = new CurriculumChunk("kg-count-34", Subject.MATH, GradeLevel.KINDERGARTEN,
                "Nhận thức / Làm quen với toán / Số lượng", text, false,
                List.of(new CurriculumChunk.SourceFragment(62, 74, "AGE_3_4", text)), "COGNITIVE",
                List.of("MATHEMATICAL_CONCEPTS", "NUMBER_AND_QUANTITY"), "AGE_3_4");
        var dataset = new CurriculumDataset(source, List.of(chunk));
        var store = new InMemoryEmbeddingStore<TextSegment>();
        store.add(Embedding.from(new float[]{1, 0}), chunk.toSegment(source, "fixture"));
        EmbeddingModel model = new EmbeddingModel() {
            @Override public Response<List<Embedding>> embedAll(List<TextSegment> segments) {
                return Response.from(segments.stream().map(segment -> Embedding.from(new float[]{1, 0})).toList());
            }
        };
        var retriever = new CurriculumRAGService(store, model, source, "fixture", 3, 0.9);
        var provider = new VerifiedCurriculumContextProvider(new CurriculumCatalog(List.of(dataset), Set.of(GameType.QUIZ)),
                new CurriculumAvailability(Clock.systemUTC(), Duration.ofSeconds(30), ignored -> {}), () -> retriever,
                () -> { throw new AssertionError("Primary-school constraints must not run for kindergarten"); },
                "", CurriculumMetrics.noop(), "fixture", 8, 0.5,
                () -> (topic, age, candidates) -> candidates.stream().filter(c -> c.ageBand().equals(age.metadataValue()))
                        .map(CurriculumRAGService.RetrievedChunk::chunkId).collect(java.util.stream.Collectors.toSet()));

        assertThatThrownBy(() -> provider.retrieve("count animals", Subject.VIETNAMESE, GradeLevel.KINDERGARTEN))
                .isInstanceOf(KindergartenAgeBandRequiredException.class)
                .hasMessageContaining("3–4, 4–5 hoặc 5–6");
        var evidence = provider.retrieve("count animals", Subject.VIETNAMESE, GradeLevel.KINDERGARTEN, KindergartenAgeBand.AGE_3_4);

        assertThat(evidence.context()).contains("Kết quả mong đợi");
        assertThat(evidence.evidence().chunks()).extracting(CurriculumRAGService.RetrievedChunk::ageBand)
                .containsExactly("AGE_3_4");
    }

    @Test void kindergartenSimilarityIsNotAcceptedWhenNoSemanticVerifierIsConfigured() {
        var source = new CurriculumSource("preschool.pdf", "b".repeat(64), "01/VBHN-BGDĐT-2021",
                "kindergarten-outcomes-v1", 84);
        var text = "Count similar objects to five.";
        var chunk = new CurriculumChunk("kg-count-34", Subject.MATH, GradeLevel.KINDERGARTEN,
                "Cognitive / mathematical concepts", text, false,
                List.of(new CurriculumChunk.SourceFragment(62, 74, "AGE_3_4", text)), "COGNITIVE",
                List.of("MATHEMATICAL_CONCEPTS"), "AGE_3_4");
        var dataset = new CurriculumDataset(source, List.of(chunk));
        var store = new InMemoryEmbeddingStore<TextSegment>();
        store.add(Embedding.from(new float[]{1, 0}), chunk.toSegment(source, "fixture"));
        EmbeddingModel model = new EmbeddingModel() {
            @Override public Response<List<Embedding>> embedAll(List<TextSegment> segments) {
                return Response.from(segments.stream().map(s -> Embedding.from(new float[]{1, 0})).toList());
            }
        };
        var retriever = new CurriculumRAGService(store, model, source, "fixture", 3, 0.5);
        var retrievalCalls = new java.util.concurrent.atomic.AtomicInteger();
        var provider = new VerifiedCurriculumContextProvider(new CurriculumCatalog(List.of(dataset), Set.of(GameType.QUIZ)),
                new CurriculumAvailability(Clock.systemUTC(), Duration.ofSeconds(30), ignored -> {}),
                () -> { retrievalCalls.incrementAndGet(); return retriever; }, () -> null, "",
                CurriculumMetrics.noop(), "fixture", 8, 0.5);

        assertThatThrownBy(() -> provider.retrieve("sort animals by habitat", Subject.MATH,
                GradeLevel.KINDERGARTEN, KindergartenAgeBand.AGE_3_4))
                .isInstanceOf(CurriculumServiceUnavailableException.class)
                .hasMessageContaining("đang khóa");
        assertThat(retrievalCalls).hasValue(0);
    }
}
