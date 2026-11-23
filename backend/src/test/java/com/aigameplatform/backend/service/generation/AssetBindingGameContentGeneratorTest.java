package com.aigameplatform.backend.service.generation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.service.asset.KeywordAssetRetriever;
import com.aigameplatform.backend.service.asset.binding.AssetBinder;
import com.aigameplatform.backend.service.asset.binding.CellExtractor;
import com.aigameplatform.backend.service.asset.binding.ConceptGraphResolver;
import com.aigameplatform.backend.service.asset.binding.GameAssetBinder;
import com.aigameplatform.backend.service.asset.binding.LabelLookupResolver;
import com.aigameplatform.backend.service.asset.binding.StyleLockPolicy;
import com.aigameplatform.backend.service.asset.concept.ConceptGraph;
import com.aigameplatform.backend.service.factory.GameAssetCatalog;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.testsupport.GameAssetCatalogFixture;
import com.aigameplatform.backend.service.testsupport.GameTestFixtures;
import com.aigameplatform.backend.service.validation.ai.AiOutputReport;
import com.aigameplatform.backend.service.validation.ai.AiOutputSchemas;
import com.aigameplatform.backend.service.validation.ai.AiOutputValidator;
import dev.langchain4j.model.chat.ChatModel;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.MapPropertySource;
import tools.jackson.databind.json.JsonMapper;

class AssetBindingGameContentGeneratorTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final GameAssetCatalog CATALOG = GameAssetCatalogFixture.ASSETS;

    private GeminiGameContentGenerator delegate;
    private GameAssetBinder binder;
    private AssetBindingGameContentGenerator generator;

    @BeforeEach
    void setUp() {
        delegate = mock(GeminiGameContentGenerator.class);
        LabelLookupResolver labelResolver = new LabelLookupResolver(new KeywordAssetRetriever(CATALOG), CATALOG);
        ConceptGraphResolver conceptResolver = new ConceptGraphResolver(new ConceptGraph(MAPPER, CATALOG), CATALOG);
        StyleLockPolicy styleLock = new StyleLockPolicy(true, 0.5);
        binder = new GameAssetBinder(new CellExtractor(), List.of(labelResolver, conceptResolver), styleLock, CATALOG);
        generator = new AssetBindingGameContentGenerator(delegate, binder, MAPPER, "fill-empty");
    }

    private static GenerationAttempt quizAttempt() {
        return new GenerationAttempt(
                GameType.QUIZ,
                "Con vật nuôi",
                Subject.VIETNAMESE,
                GradeLevel.GRADE_1,
                AiOutputSchemas.rawJson(GameType.QUIZ),
                null,
                1,
                null,
                List.of()
        );
    }

    private static GenerationAttempt oddOneOutAttempt() {
        return new GenerationAttempt(
                GameType.ODD_ONE_OUT,
                "Tìm từ khác",
                Subject.VIETNAMESE,
                GradeLevel.GRADE_1,
                AiOutputSchemas.rawJson(GameType.ODD_ONE_OUT),
                null,
                1,
                null,
                List.of()
        );
    }

    @Test
    void contextLoadsDecoratorAsPrimaryWhenBothPropertiesEnabled() {
        try (var context = new AnnotationConfigApplicationContext()) {
            context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("test", Map.of(
                    "app.ai.gemini.game-generation.enabled", "true",
                    "app.assets.binder.enabled", "true",
                    "app.ai.gemini.api-key", "fixture-key")));

            context.registerBean("gameGenerationChatModel", ChatModel.class, () -> mock(ChatModel.class));
            context.registerBean("questionRegenerationChatModel", ChatModel.class, () -> mock(ChatModel.class));
            context.registerBean(JsonMapper.class, () -> MAPPER);
            context.registerBean(GameContentStrategyRegistry.class,
                    () -> new GameContentStrategyRegistry(GameTestFixtures.strategies(MAPPER)));
            context.registerBean(GameAssetCatalog.class, () -> CATALOG);
            context.registerBean(com.aigameplatform.backend.service.media.NotoEmojiCatalog.class);
            context.registerBean(com.aigameplatform.backend.service.asset.AssetRetriever.class, () -> mock(com.aigameplatform.backend.service.asset.AssetRetriever.class));
            context.registerBean(AssetBinder.class, () -> binder);

            context.register(GeminiGameContentGenerator.class, AssetBindingGameContentGenerator.class);
            assertThatCode(context::refresh).doesNotThrowAnyException();

            // getBean(GameContentGenerator.class) ra đúng Decorator do có @Primary, không ambiguity
            GameContentGenerator bean = context.getBean(GameContentGenerator.class);
            assertThat(bean).isInstanceOf(AssetBindingGameContentGenerator.class);
            assertThat(context.getBean(GeminiGameContentGenerator.class)).isNotNull();
            assertThat(context.getBean(AssetBindingGameContentGenerator.class)).isNotNull();
        }
    }

    @Test
    void decoratorNotLoadedWhenBinderDisabled() {
        try (var context = new AnnotationConfigApplicationContext()) {
            context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("test", Map.of(
                    "app.ai.gemini.game-generation.enabled", "true",
                    "app.assets.binder.enabled", "false",
                    "app.ai.gemini.api-key", "fixture-key")));

            context.registerBean("gameGenerationChatModel", ChatModel.class, () -> mock(ChatModel.class));
            context.registerBean("questionRegenerationChatModel", ChatModel.class, () -> mock(ChatModel.class));
            context.registerBean(JsonMapper.class, () -> MAPPER);
            context.registerBean(GameContentStrategyRegistry.class,
                    () -> new GameContentStrategyRegistry(GameTestFixtures.strategies(MAPPER)));
            context.registerBean(GameAssetCatalog.class, () -> CATALOG);
            context.registerBean(com.aigameplatform.backend.service.media.NotoEmojiCatalog.class);
            context.registerBean(com.aigameplatform.backend.service.asset.AssetRetriever.class, () -> mock(com.aigameplatform.backend.service.asset.AssetRetriever.class));
            context.registerBean(AssetBinder.class, () -> binder);

            context.register(GeminiGameContentGenerator.class, AssetBindingGameContentGenerator.class);
            assertThatCode(context::refresh).doesNotThrowAnyException();

            // Khi tắt binder, getBean(GameContentGenerator.class) ra thẳng GeminiGameContentGenerator
            GameContentGenerator bean = context.getBean(GameContentGenerator.class);
            assertThat(bean).isInstanceOf(GeminiGameContentGenerator.class);
            assertThat(context.getBeanNamesForType(AssetBindingGameContentGenerator.class)).isEmpty();
        }
    }

    @Test
    void corruptJsonReturnsRawStringWithoutException() {
        String corrupt = "{ invalid json content ...";
        when(delegate.generate(any())).thenReturn(corrupt);

        String result = generator.generate(quizAttempt());
        assertThat(result).isEqualTo(corrupt);
    }

    @Test
    void delegateExceptionIsRethrown() {
        when(delegate.generate(any())).thenThrow(new AiServiceUnavailableException("Gemini quota exceeded"));

        assertThatThrownBy(() -> generator.generate(quizAttempt()))
                .isInstanceOf(AiServiceUnavailableException.class)
                .hasMessageContaining("Gemini quota exceeded");
    }

    @Test
    void schemaWithoutAssetPropertyIsNotModified() {
        AssetBinder mockBinder = mock(AssetBinder.class);
        AssetBindingGameContentGenerator genWithMock =
                new AssetBindingGameContentGenerator(delegate, mockBinder, MAPPER, "fill-empty");

        String oddOneOutJson = """
                {
                  "questions": [
                    {
                      "items": ["chó", "mèo", "ghế"],
                      "oddOneOutIndex": 2,
                      "audioText": "Tìm từ khác"
                    }
                  ]
                }
                """;
        when(delegate.generate(any())).thenReturn(oddOneOutJson);

        String result = genWithMock.generate(oddOneOutAttempt());
        assertThat(result).isEqualTo(oddOneOutJson);
        verify(mockBinder, never()).bind(any(), any());
    }

    @Test
    void boundJsonPassesAiOutputValidator() {
        String aiRawJson = """
                {
                  "questions": [
                    {
                      "text": "Con gì bắt chuột?",
                      "options": ["Con chó", "Con mèo"],
                      "correctIndex": 1,
                      "visualPrompt": "con mèo"
                    }
                  ]
                }
                """;
        when(delegate.generate(any())).thenReturn(aiRawJson);

        String boundJson = generator.generate(quizAttempt());

        AiOutputValidator validator = new AiOutputValidator(MAPPER);
        AiOutputReport report = validator.validate(GameType.QUIZ, boundJson);
        assertThat(report.errors()).isEmpty();
        assertThat(report.output()).isNotNull();
        assertThat(boundJson).contains("\"asset\":\"anim-cat\"");
    }

    @Test
    void invalidModeThrowsIllegalArgumentException() {
        assertThatThrownBy(() -> new AssetBindingGameContentGenerator(delegate, binder, MAPPER, "unknown-mode"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("app.assets.binder.mode");
    }
}
