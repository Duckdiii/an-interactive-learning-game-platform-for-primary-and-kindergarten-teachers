package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.Map;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.MapPropertySource;

class CurriculumRagConfigurationTest {
    @Test void runtimeCatalogIncludesPdfVerifiedPreschoolCorpusWithoutSeparateExpertHash() throws Exception {
        var configuration = new CurriculumRagConfiguration();
        var catalog = configuration.curriculumCatalog();

        for (var subject : java.util.List.of(com.aigameplatform.backend.entity.enums.Subject.MATH,
                com.aigameplatform.backend.entity.enums.Subject.VIETNAMESE,
                com.aigameplatform.backend.entity.enums.Subject.ENGLISH)) {
            for (var grade : java.util.List.of(com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_1,
                    com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_2,
                    com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_3,
                    com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_4,
                    com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_5)) {
                assertThat(catalog.requireSupported(com.aigameplatform.backend.entity.enums.GameType.QUIZ, subject, grade)
                        .chunks().stream().filter(chunk -> !chunk.control()).count()).isPositive();
            }
        }
        assertThat(catalog.requireSupported(com.aigameplatform.backend.entity.enums.GameType.QUIZ,
                com.aigameplatform.backend.entity.enums.Subject.VIETNAMESE,
                com.aigameplatform.backend.entity.enums.GradeLevel.KINDERGARTEN)
                .chunks()).hasSize(134);
    }

    @Test void runtimeCatalogAllowsEveryExistingGameTypeForPublishedCurriculumScopes() throws Exception {
        var catalog = new CurriculumRagConfiguration().curriculumCatalog();

        for (var gameType : com.aigameplatform.backend.entity.enums.GameType.dslTypes()) {
            assertThatCode(() -> catalog.requireSupported(gameType,
                    com.aigameplatform.backend.entity.enums.Subject.MATH,
                    com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_1))
                    .as(gameType.name()).doesNotThrowAnyException();
        }
    }

    @Test void runtimeCatalogDoesNotOfferDslGenerationForCustomGames() throws Exception {
        var catalog = new CurriculumRagConfiguration().curriculumCatalog();

        assertThatThrownBy(() -> catalog.requireSupported(com.aigameplatform.backend.entity.enums.GameType.CUSTOM,
                com.aigameplatform.backend.entity.enums.Subject.MATH,
                com.aigameplatform.backend.entity.enums.GradeLevel.GRADE_1))
                .isInstanceOf(com.aigameplatform.backend.exception.GenerationScopeUnsupportedException.class);
    }

    @Test void generatorAndSemanticModelsCanBeEnabledTogetherWithoutAmbiguousInjection() {
        try (var context = new AnnotationConfigApplicationContext()) {
            context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("test", Map.of(
                    "app.curriculum-rag.enabled", "true", "app.ai.gemini.game-generation.enabled", "true",
                    "app.ai.gemini.api-key", "fixture-not-a-real-key")));
            context.registerBean(DataSource.class, () -> mock(DataSource.class));
            var mapper = new tools.jackson.databind.json.JsonMapper();
            context.registerBean(tools.jackson.databind.json.JsonMapper.class, () -> mapper);
            context.registerBean(com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry.class,
                    () -> new com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry(
                            com.aigameplatform.backend.service.testsupport.GameTestFixtures.strategies(mapper)));
            context.register(CurriculumRagConfiguration.class,
                    com.aigameplatform.backend.service.generation.GeminiChatConfiguration.class,
                    com.aigameplatform.backend.service.generation.GeminiGameContentGenerator.class);
            assertThatCode(context::refresh).doesNotThrowAnyException();
            assertThat(context.getBean("gameGenerationChatModel"))
                    .isNotSameAs(context.getBean("curriculumSemanticVerifierChatModel"));
            assertThat(context.getBean(com.aigameplatform.backend.service.generation.GeneratedContentReviewer.class))
                    .isNotNull();
        }
    }

    @Test void ragConfigurationDefersCorpusDbAndProviderAccess() {
        var database = mock(DataSource.class);
        try (var context = new AnnotationConfigApplicationContext()) {
            context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("test",
                    Map.of("app.curriculum-rag.enabled", "true")));
            context.registerBean(DataSource.class, () -> database);
            context.register(CurriculumRagConfiguration.class);
            assertThatCode(context::refresh).doesNotThrowAnyException();
            assertThat(context.getBean(CurriculumContextProvider.class)).isInstanceOf(VerifiedCurriculumContextProvider.class);
            verifyNoInteractions(database);
        }
    }
}
