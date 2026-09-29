package com.aigameplatform.backend.service.validation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import com.aigameplatform.backend.service.validation.safety.ContentModerationClient;
import com.aigameplatform.backend.service.validation.safety.ModerationResult;
import com.aigameplatform.backend.service.validation.safety.ModerationUnavailableException;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

@ExtendWith(MockitoExtension.class)
class SafetyGameValidatorTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final ModerationResult CLEAN = new ModerationResult(false, List.of());

    @Mock
    private ContentModerationClient client;

    private final BlockedWordList blockedWords = new BlockedWordList(List.of("fuck", "cứt"));

    private static ObjectNode quiz() throws IOException {
        try (InputStream in = SafetyGameValidatorTest.class.getResourceAsStream("/dsl-examples/quiz.json")) {
            return (ObjectNode) MAPPER.readTree(in);
        }
    }

    private SafetyGameValidator validator(boolean configured) {
        when(client.isConfigured()).thenReturn(configured);
        return new SafetyGameValidator(blockedWords, client, false);
    }

    private static List<ModerationResult> allClean(int count) {
        return new ArrayList<>(Collections.nCopies(count, CLEAN));
    }

    @Test
    void cleanGameIsSentToModerationOnceWithOnlyReadableText() throws IOException {
        SafetyGameValidator validator = validator(true);
        when(client.moderate(anyList())).thenAnswer(inv -> allClean(((List<?>) inv.getArgument(0)).size()));

        List<ValidationError> errors = validator.validate(new GameValidationContext(quiz()));

        assertThat(errors).isEmpty();
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<String>> captor = ArgumentCaptor.forClass(List.class);
        verify(client).moderate(captor.capture());
        assertThat(captor.getValue()).contains("Có mấy con mèo?", "three cats", "Ví dụ QUIZ")
                .doesNotContain("QUIZ", "1.0.0", "q1", "GRADE_1");
    }

    @Test
    void blockedWordIsRejectedWithoutCallingModeration() throws IOException {
        SafetyGameValidator validator = validator(true);
        ObjectNode json = quiz();
        ((ObjectNode) ((ArrayNode) json.get("questions")).get(1)).put("questionText", "Con FUCK nào?");

        List<ValidationError> errors = validator.validate(new GameValidationContext(json));

        assertThat(errors).hasSize(1);
        assertThat(errors.get(0).path()).isEqualTo("$.questions[1].questionText");
        assertThat(errors.get(0).kind()).isEqualTo(ValidationError.Kind.UNSAFE);
        verify(client, never()).moderate(anyList());
    }

    @Test
    void unsafeMessageDoesNotRepeatTheBlockedWord() throws IOException {
        SafetyGameValidator validator = validator(true);
        ObjectNode json = quiz();
        ((ObjectNode) json.get("metadata")).put("title", "cứt");

        assertThat(validator.validate(new GameValidationContext(json)).get(0).message()).doesNotContain("cứt");
    }

    @Test
    void moderationFlagPointsToTheOffendingText() throws IOException {
        SafetyGameValidator validator = validator(true);
        ObjectNode json = quiz();
        int total = com.aigameplatform.backend.service.validation.safety.GameTextExtractor.extract(json).size();
        String flaggedPath = com.aigameplatform.backend.service.validation.safety.GameTextExtractor.extract(json).get(3).path();
        List<ModerationResult> results = allClean(total);
        results.set(3, new ModerationResult(true, List.of("violence")));
        when(client.moderate(anyList())).thenReturn(results);

        List<ValidationError> errors = validator.validate(new GameValidationContext(json));

        assertThat(errors).hasSize(1);
        assertThat(errors.get(0).path()).isEqualTo(flaggedPath);
        assertThat(errors.get(0).kind()).isEqualTo(ValidationError.Kind.UNSAFE);
        assertThat(errors.get(0).message()).contains("violence");
    }

    @Test
    void moderationOutageIsReportedAsUnavailableNotAsSafe() throws IOException {
        SafetyGameValidator validator = validator(true);
        when(client.moderate(anyList())).thenThrow(new ModerationUnavailableException("timeout"));

        List<ValidationError> errors = validator.validate(new GameValidationContext(quiz()));

        assertThat(errors).hasSize(1);
        assertThat(errors.get(0).kind()).isEqualTo(ValidationError.Kind.UNAVAILABLE);
        assertThat(errors.get(0).path()).isEqualTo("$");
    }

    @Test
    void missingResultsAreNotTreatedAsSafe() throws IOException {
        SafetyGameValidator validator = validator(true);
        when(client.moderate(anyList())).thenReturn(allClean(1));

        List<ValidationError> errors = validator.validate(new GameValidationContext(quiz()));

        assertThat(errors).extracting(ValidationError::kind).containsExactly(ValidationError.Kind.UNAVAILABLE);
    }

    @Test
    void withoutAKeyOnlyTheBlockedWordListRuns() throws IOException {
        SafetyGameValidator validator = validator(false);

        assertThat(validator.validate(new GameValidationContext(quiz()))).isEmpty();
        verify(client, never()).moderate(anyList());
    }

    @Test
    void blockedWordsStillWorkWithoutAKey() throws IOException {
        SafetyGameValidator validator = validator(false);
        ObjectNode json = quiz();
        ((ObjectNode) json.get("metadata")).put("title", "fuck");

        assertThat(validator.validate(new GameValidationContext(json))).hasSize(1);
    }

    @Test
    void refusesToStartWhenModerationIsRequiredButNotConfigured() {
        when(client.isConfigured()).thenReturn(false);

        assertThatThrownBy(() -> new SafetyGameValidator(blockedWords, client, true))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void reportHelpersDistinguishTheKindsOfFailure() {
        ValidationReport unsafe = new ValidationReport(
                List.of(new ValidationError("$", "x", ValidationError.Kind.UNSAFE)), null);
        ValidationReport unavailable = new ValidationReport(
                List.of(new ValidationError("$", "x", ValidationError.Kind.UNAVAILABLE)), null);
        ValidationReport invalid = new ValidationReport(List.of(new ValidationError("$", "x")), null);

        assertThat(unsafe.unsafe()).isTrue();
        assertThat(unsafe.unavailable()).isFalse();
        assertThat(unavailable.unavailable()).isTrue();
        assertThat(invalid.unsafe()).isFalse();
        assertThat(invalid.unavailable()).isFalse();
    }
}
