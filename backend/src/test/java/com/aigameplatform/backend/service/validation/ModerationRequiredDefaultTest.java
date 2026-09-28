package com.aigameplatform.backend.service.validation;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import com.aigameplatform.backend.service.validation.safety.OpenAiModerationClient;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

/** Mặc định của Layer 3 là bắt buộc kiểm duyệt: quên đặt OPENAI_API_KEY thì app không được khởi động. */
class ModerationRequiredDefaultTest {

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(SafetyGameValidator.class, BlockedWordList.class, OpenAiModerationClient.class)
            .withPropertyValues(
                    "app.moderation.blocked-words-location=classpath:moderation/blocked-words-vi.txt",
                    "app.moderation.openai.base-url=https://api.openai.com",
                    "app.moderation.openai.api-key=",
                    "app.moderation.openai.model=omni-moderation-latest",
                    "app.moderation.openai.timeout-seconds=1");

    @Test
    void withoutAnyOverrideAMissingKeyStopsTheApplication() {
        runner.run(context -> {
            assertThat(context).hasFailed();
            assertThat(context.getStartupFailure()).hasRootCauseInstanceOf(IllegalStateException.class)
                    .rootCause().hasMessageContaining("OPENAI_API_KEY");
        });
    }

    @Test
    void explicitlyTurningItOffAllowsBlockedWordsOnlyOnAPersonalMachine() {
        runner.withPropertyValues("app.moderation.required=false")
                .run(context -> assertThat(context).hasNotFailed());
    }

    @Test
    void withAKeyItStartsByDefault() {
        runner.withPropertyValues("app.moderation.openai.api-key=some-key")
                .run(context -> assertThat(context).hasNotFailed());
    }
}
