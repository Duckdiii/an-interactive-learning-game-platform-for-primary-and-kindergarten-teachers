package com.aigameplatform.backend.service.validation;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class AbstractGameValidatorTest {

    /** Validator giả: ghi lại thứ tự được gọi và trả lỗi cố định. */
    private static class RecordingValidator extends AbstractGameValidator {
        private final String name;
        private final List<String> calls;
        private final List<ValidationError> errors;

        RecordingValidator(String name, List<String> calls, List<ValidationError> errors) {
            this.name = name;
            this.calls = calls;
            this.errors = errors;
        }

        @Override
        protected List<ValidationError> check(GameValidationContext context) {
            calls.add(name);
            return errors;
        }
    }

    private static final GameValidationContext CONTEXT = new GameValidationContext(null);
    private static final ValidationError ERROR = new ValidationError("$.x", "lỗi");

    @Test
    void runsEveryValidatorInOrderWhenAllPass() {
        List<String> calls = new ArrayList<>();
        AbstractGameValidator first = new RecordingValidator("layer1", calls, List.of());
        first.linkWith(new RecordingValidator("layer2", calls, List.of()))
                .linkWith(new RecordingValidator("layer3", calls, List.of()));

        assertThat(first.validate(CONTEXT)).isEmpty();
        assertThat(calls).containsExactly("layer1", "layer2", "layer3");
    }

    @Test
    void stopsAtTheFirstFailureAndReturnsItsErrors() {
        List<String> calls = new ArrayList<>();
        AbstractGameValidator first = new RecordingValidator("layer1", calls, List.of());
        first.linkWith(new RecordingValidator("layer2", calls, List.of(ERROR)))
                .linkWith(new RecordingValidator("layer3", calls, List.of()));

        assertThat(first.validate(CONTEXT)).containsExactly(ERROR);
        assertThat(calls).containsExactly("layer1", "layer2");
    }

    @Test
    void aSingleValidatorWorksWithoutANext() {
        List<String> calls = new ArrayList<>();
        AbstractGameValidator only = new RecordingValidator("only", calls, List.of(ERROR));

        assertThat(only.validate(CONTEXT)).containsExactly(ERROR);
        assertThat(calls).containsExactly("only");
    }
}
