package com.aigameplatform.backend.service.validation;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import com.aigameplatform.backend.service.validation.safety.OpenAiModerationClient;
import java.io.IOException;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.core.env.PropertySource;
import org.springframework.core.env.PropertySourcesPropertyResolver;
import org.springframework.core.io.ClassPathResource;

/** Mặc định của Layer 3 là bắt buộc kiểm duyệt: quên đặt OPENAI_API_KEY thì app không được khởi động. */
class ModerationRequiredDefaultTest {

    private static final String REQUIRED_KEY = "app.moderation.required";

    private final ApplicationContextRunner runner = new ApplicationContextRunner()
            .withUserConfiguration(SafetyGameValidator.class, BlockedWordList.class, OpenAiModerationClient.class)
            .withPropertyValues(
                    "app.moderation.blocked-words-location=classpath:moderation/blocked-words-vi.txt",
                    "app.moderation.openai.base-url=https://api.openai.com",
                    "app.moderation.openai.api-key=",
                    "app.moderation.openai.model=omni-moderation-latest",
                    "app.moderation.openai.timeout-seconds=1");

    // ---- giá trị dự phòng trong SafetyGameValidator (runner không nạp application.yml) ----

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
        runner.withPropertyValues(REQUIRED_KEY + "=false")
                .run(context -> assertThat(context).hasNotFailed());
    }

    @Test
    void withAKeyItStartsByDefault() {
        runner.withPropertyValues("app.moderation.openai.api-key=some-key")
                .run(context -> assertThat(context).hasNotFailed());
    }

    // ---- cấu hình thật trong application.yml ----

    private static MutablePropertySources realApplicationYml() throws IOException {
        MutablePropertySources sources = new MutablePropertySources();
        for (PropertySource<?> source : new YamlPropertySourceLoader()
                .load("application", new ClassPathResource("application.yml"))) {
            sources.addLast(source);
        }
        return sources;
    }

    @Test
    void theRealApplicationYmlDefaultsToRequired() throws IOException {
        PropertySourcesPropertyResolver resolver = new PropertySourcesPropertyResolver(realApplicationYml());

        assertThat(resolver.getProperty(REQUIRED_KEY)).isEqualTo("true");
    }

    @Test
    void theEnvironmentVariableStillOverridesTheYmlDefault() throws IOException {
        MutablePropertySources sources = realApplicationYml();
        sources.addFirst(new MapPropertySource("env", Map.of("MODERATION_REQUIRED", "false")));

        assertThat(new PropertySourcesPropertyResolver(sources).getProperty(REQUIRED_KEY)).isEqualTo("false");
    }
}
