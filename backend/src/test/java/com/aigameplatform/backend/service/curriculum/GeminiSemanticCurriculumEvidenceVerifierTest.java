package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class GeminiSemanticCurriculumEvidenceVerifierTest {
    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    @Test
    void supportsOnlyCandidatesTheVerifierSelectsAndIncludesScopeInPrompt() {
        var request = new AtomicReference<ChatRequest>();
        var verifier = new GeminiSemanticCurriculumEvidenceVerifier(model(request,
                "{\"status\":\"SUPPORTED\",\"reasonCode\":\"DIRECT_SUPPORT\",\"supportedChunkIds\":[\"vi-g2-003\"]}"),
                MAPPER, "review-model");

        var decision = verifier.verify("Cho bé nối tiếng đầu với hình phù hợp", Subject.VIETNAMESE,
                GradeLevel.GRADE_2, null, candidates());

        assertThat(decision.status()).isEqualTo(SemanticCurriculumEvidenceVerifier.Status.SUPPORTED);
        assertThat(decision.supportedChunkIds()).containsExactly("vi-g2-003");
        assertThat(request.get().messages().toString()).contains("GRADE_2", "VIETNAMESE", "vi-g2-003");
        assertThat(request.get().parameters().responseFormat()).isNotNull();
    }

    @Test
    void rejectsVerifierInventingCandidateIds() {
        var verifier = new GeminiSemanticCurriculumEvidenceVerifier(model(new AtomicReference<>(),
                "{\"status\":\"SUPPORTED\",\"reasonCode\":\"DIRECT_SUPPORT\",\"supportedChunkIds\":[\"vi-g2-999\"]}"),
                MAPPER, "review-model");

        assertThatThrownBy(() -> verifier.verify("Nội dung", Subject.VIETNAMESE,
                GradeLevel.GRADE_2, null, candidates()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void distinguishesClarificationFromInsufficientCurriculumEvidence() {
        var clarification = new GeminiSemanticCurriculumEvidenceVerifier(model(new AtomicReference<>(),
                "{\"status\":\"NEEDS_CLARIFICATION\",\"reasonCode\":\"MISSING_AGE\",\"supportedChunkIds\":[]}"),
                MAPPER, "review-model");
        var unsupported = new GeminiSemanticCurriculumEvidenceVerifier(model(new AtomicReference<>(),
                "{\"status\":\"INSUFFICIENT_EVIDENCE\",\"reasonCode\":\"NO_OUTCOME\",\"supportedChunkIds\":[]}"),
                MAPPER, "review-model");

        assertThat(clarification.verify("Nội dung", Subject.VIETNAMESE, GradeLevel.GRADE_2, null, candidates()).status())
                .isEqualTo(SemanticCurriculumEvidenceVerifier.Status.NEEDS_CLARIFICATION);
        assertThat(unsupported.verify("Nội dung", Subject.VIETNAMESE, GradeLevel.GRADE_2, null, candidates()).status())
                .isEqualTo(SemanticCurriculumEvidenceVerifier.Status.INSUFFICIENT_EVIDENCE);
    }

    private static ChatModel model(AtomicReference<ChatRequest> request, String responseText) {
        return new ChatModel() {
            @Override public ChatResponse doChat(ChatRequest chatRequest) {
                request.set(chatRequest);
                return ChatResponse.builder().aiMessage(AiMessage.from(responseText)).build();
            }
        };
    }

    private static List<CurriculumRAGService.RetrievedChunk> candidates() {
        return List.of(new CurriculumRAGService.RetrievedChunk("vi-g2-003", Subject.VIETNAMESE,
                GradeLevel.GRADE_2, "Nghe và nói", "Nghe, hiểu và thực hiện được yêu cầu đơn giản.", .2,
                "program.pdf", List.of(78), List.of(5), "32/2018/TT-BGDDT"));
    }
}
