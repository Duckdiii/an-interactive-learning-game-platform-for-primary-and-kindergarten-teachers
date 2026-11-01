package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;
import com.aigameplatform.backend.entity.enums.*;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.output.Response;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import java.util.stream.Stream;
import org.junit.jupiter.api.*;

/** Fixture vectors/decisions: contract regressions, NOT live ranking or semantic quality measurements. */
class CurriculumRuntimeEvaluationTest {
    @TestFactory Stream<DynamicTest> allDatasetsUseProductionProviderWithNaturalDraftQueries() throws Exception {
        var datasets = CurriculumDataset.loadPackaged();
        var store = new InMemoryEmbeddingStore<TextSegment>();
        for (var d : datasets) for (var c : d.chunks())
            store.add(Embedding.from(new float[]{1, 0}), c.toSegment(d.source(), "fixture"));
        EmbeddingModel embedding = new EmbeddingModel() {
            public Response<List<Embedding>> embedAll(List<TextSegment> segments) {
                return Response.from(segments.stream().map(s -> Embedding.from(new float[]{1, 0})).toList());
            }
        };
        return datasets.stream().map(d -> DynamicTest.dynamicTest(d.source().datasetVersion(), () -> {
            var root = Path.of("..", "docs", "rag-spike", "evaluation-drafts", d.source().datasetVersion());
            var dev = CurriculumRuntimeEvaluation.loadDraft(root.resolve("DEV.jsonl"), d, "DEV");
            assertThat(dev).hasSize(30);
            var candidateSet = CurriculumRuntimeEvaluation.loadDraft(root.resolve("HOLDOUT_CANDIDATE.jsonl"), d, "HOLDOUT_CANDIDATE");
            assertThat(candidateSet).hasSize(60);
            var positive = dev.getFirst();
            var negative = dev.stream().filter(q -> !q.expectedSupported()).findFirst().orElseThrow();
            var positives = Stream.concat(dev.stream().limit(3), candidateSet.stream().limit(3)).toList();
            var expectedByTopic = positives.stream().collect(java.util.stream.Collectors.toMap(
                    CurriculumBenchmark.Query::topic, CurriculumBenchmark.Query::expectedChunkIds));
            var readiness = new CurriculumAvailability(Clock.systemUTC(), Duration.ofSeconds(30), ignored -> {});
            SemanticCurriculumEvidenceVerifier fixtureDecision = (topic, subject, grade, age, candidates) -> {
                assertThat(candidates).allSatisfy(c -> {
                    assertThat(c.curriculumVersion()).isEqualTo(d.source().curriculumVersion());
                    assertThat(c.sourceDocument()).isEqualTo(d.source().sourceDocument());
                    if (age != null) assertThat(c.ageBand()).isEqualTo(age.metadataValue());
                });
                return expectedByTopic.containsKey(topic)
                        ? new SemanticCurriculumEvidenceVerifier.Decision(SemanticCurriculumEvidenceVerifier.Status.SUPPORTED,
                                "FIXTURE_SUPPORTED", expectedByTopic.get(topic))
                        : new SemanticCurriculumEvidenceVerifier.Decision(SemanticCurriculumEvidenceVerifier.Status.INSUFFICIENT_EVIDENCE,
                                "FIXTURE_UNSUPPORTED", List.of());
            };
            String sha = d.chunks().getFirst().subject() == Subject.MATH
                    && d.chunks().getFirst().gradeLevel() == GradeLevel.GRADE_1
                    ? CurriculumConstraints.load(d).sha256() : "";
            var outcomes = CurriculumRuntimeEvaluation.evaluate(d, Stream.concat(positives.stream(), Stream.of(negative)).toList(), store, embedding,
                    "fixture", fixtureDecision, readiness, sha);
            assertThat(outcomes).extracting(CurriculumRuntimeEvaluation.Outcome::status)
                    .containsExactly("SUPPORTED", "SUPPORTED", "SUPPORTED", "SUPPORTED", "SUPPORTED", "SUPPORTED", "INSUFFICIENT_EVIDENCE");
            assertThat(outcomes.getFirst().selectedIds()).containsExactlyElementsOf(positive.expectedChunkIds());
            assertThat(CurriculumRuntimeEvaluation.summarize(outcomes, d)).containsEntry("releaseGate", "NOT_ESTABLISHED");
            var unavailable = CurriculumRuntimeEvaluation.evaluate(d, List.of(positive), store, embedding, "fixture",
                    (topic, subject, grade, age, candidates) -> { throw new IllegalStateException("fixture provider down"); },
                    readiness, sha);
            assertThat(unavailable.getFirst().status()).isEqualTo("SERVICE_UNAVAILABLE");
            assertThat(CurriculumRuntimeEvaluation.summarize(unavailable, d))
                    .containsEntry("serviceUnavailable", 1L).containsEntry("measurementComplete", false)
                    .containsEntry("exploratoryMetrics", null);
        }));
    }

    @Test void preschoolDomainAndAgeAreFilteredTogetherBeforeTheSemanticGate() throws Exception {
        var d = CurriculumDataset.loadKindergarten();
        var store = new InMemoryEmbeddingStore<TextSegment>();
        for (var c : d.chunks()) store.add(Embedding.from(new float[]{1, 0}), c.toSegment(d.source(), "fixture"));
        EmbeddingModel embedding = new EmbeddingModel() {
            public Response<List<Embedding>> embedAll(List<TextSegment> segments) {
                return Response.from(segments.stream().map(s -> Embedding.from(new float[]{1, 0})).toList());
            }
        };
        var retriever = new CurriculumRAGService(store, embedding, d.source(), "fixture", 3, .855);
        var provider = new VerifiedCurriculumContextProvider(new CurriculumCatalog(List.of(d), Set.of(GameType.QUIZ)),
                new CurriculumAvailability(Clock.systemUTC(), Duration.ofSeconds(30), ignored -> {}), () -> retriever,
                () -> { throw new AssertionError("No primary constraint sidecar for preschool"); }, "",
                CurriculumMetrics.noop(), "fixture", 8, .5, () -> null,
                () -> (topic, subject, grade, age, candidates) -> {
                    assertThat(candidates).isNotEmpty().allSatisfy(c -> {
                        assertThat(c.domain()).isEqualTo("LANGUAGE");
                        assertThat(c.ageBand()).isEqualTo("AGE_4_5");
                    });
                    return new SemanticCurriculumEvidenceVerifier.Decision(SemanticCurriculumEvidenceVerifier.Status.SUPPORTED,
                            "FIXTURE_ONLY", List.of("kg-lang-listen-45"));
                });
        var evidence = provider.retrieve("Nghe rồi làm theo hai yêu cầu của cô", Subject.VIETNAMESE,
                GradeLevel.KINDERGARTEN, KindergartenAgeBand.AGE_4_5, "LANGUAGE");
        assertThat(evidence.evidence().chunks()).extracting(CurriculumRAGService.RetrievedChunk::chunkId)
                .containsExactly("kg-lang-listen-45");
        assertThat(evidence.context()).contains(d.source().sourceSha256(), d.source().datasetVersion());
    }

    @Test void preflightValidatesAllDraftFilesWithoutCallingDatabaseOrAI() throws Exception {
        var output = Path.of("target", "rag-eval-local", "runtime-preflight.json");
        CurriculumRuntimeEvaluation.main(new String[]{"--preflight", "../docs/rag-spike/evaluation-drafts", "DEV", output.toString()});
        var json = new tools.jackson.databind.json.JsonMapper().readTree(Files.readString(output));
        assertThat(json.path("scopes").size()).isEqualTo(16);
        assertThat(json.path("releaseGate").asString()).isEqualTo("NOT_ESTABLISHED");
    }

    @Test void aiDraftCannotEnterTheReviewedBenchmarkLoader() throws Exception {
        var d = CurriculumDataset.loadFromResourceRoot("/curriculum/spike/english-grade1/");
        var p = Path.of("..", "docs", "rag-spike", "evaluation-drafts", d.source().datasetVersion(), "DEV.jsonl");
        assertThatThrownBy(() -> CurriculumRuntimeEvaluation.loadQueries(p, d, "DEV", true))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test void tamperedTextAndSourcePagesCannotBecomeModelEvidence() throws Exception {
        var d = CurriculumDataset.loadDefault(); var c = d.chunks().getFirst();
        var forged = new CurriculumRAGService.RetrievedChunk(c.chunkId(), c.subject(), c.gradeLevel(), c.topic(),
                c.text() + " Forged", .99, d.source().sourceDocument(), List.of(1), List.of(1), d.source().curriculumVersion());
        assertThatThrownBy(() -> VerifiedCurriculumContextProvider.requirePackagedCandidates(d, List.of(forged)))
                .isInstanceOf(IllegalStateException.class);
        var wrongPage = new CurriculumRAGService.RetrievedChunk(c.chunkId(), c.subject(), c.gradeLevel(), c.topic(),
                c.text(), .99, d.source().sourceDocument(), List.of(1), List.of(1), d.source().curriculumVersion());
        assertThatThrownBy(() -> VerifiedCurriculumContextProvider.requirePackagedCandidates(d, List.of(wrongPage)))
                .isInstanceOf(IllegalStateException.class);
    }
}
