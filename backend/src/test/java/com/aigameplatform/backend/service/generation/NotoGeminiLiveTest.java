package com.aigameplatform.backend.service.generation;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.dto.dsl.AudioVisualMatchGameDsl;
import com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl;
import com.aigameplatform.backend.dto.request.GenerateGameRequest;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.service.curriculum.CurriculumCatalog;
import com.aigameplatform.backend.service.curriculum.CurriculumContextProvider;
import com.aigameplatform.backend.service.curriculum.CurriculumMetrics;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.testsupport.GameTestFixtures;
import com.aigameplatform.backend.service.validation.ai.AiOutputValidator;
import dev.langchain4j.model.chat.Capability;
import dev.langchain4j.model.googleai.GoogleAiGeminiChatModel;
import java.util.Random;
import java.util.Set;
import java.util.List;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import tools.jackson.databind.json.JsonMapper;

/** Opt-in live AI check with synthetic input; no database or teacher data is touched. */
@EnabledIfEnvironmentVariable(named = "RUN_NOTO_GEMINI_LIVE", matches = "true")
class NotoGeminiLiveTest {
    @Test
    void generatesAndReviewsCatalogQuestionsUsingRealGemini() {
        var key = System.getenv("GEMINI_API_KEY");
        var modelName = System.getenv().getOrDefault("GEMINI_MODEL", "gemini-2.5-flash");
        var model = GoogleAiGeminiChatModel.builder().apiKey(key).modelName(modelName)
                .supportedCapabilities(Set.of(Capability.RESPONSE_FORMAT_JSON_SCHEMA)).maxRetries(0).build();
        var mapper = JsonMapper.builder().build();
        var strategies = new GameContentStrategyRegistry(GameTestFixtures.strategies(mapper));
        var beans = new DefaultListableBeanFactory();
        beans.registerSingleton("generator", new GeminiGameContentGenerator(model, strategies));
        var service = new GameGenerationService(beans.getBeanProvider(GameContentGenerator.class),
                beans.getBeanProvider(PilotQuizContentVerifier.class), strategies, new AiOutputValidator(mapper),
                GameTestFixtures.factoryRegistry(new Random(7)), GameTestFixtures.schemaAndBusinessRuleValidation(mapper),
                mapper, beans.getBeanProvider(CurriculumContextProvider.class), beans.getBeanProvider(CurriculumCatalog.class),
                beans.getBeanProvider(CurriculumMetrics.class), false, 1);
        service.setGeneratedContentReviewer(new GeminiGeneratedContentReviewer(model, mapper, modelName));
        var resolver = new com.aigameplatform.backend.service.media.SystemPublicAddressResolver();
        var imageLoader = new com.aigameplatform.backend.service.media.SceneImageLoader(resolver,
                new com.aigameplatform.backend.service.media.PinnedHttpsSceneImageTransport(),
                new com.aigameplatform.backend.service.media.SceneImagePolicy(8_388_608, 10_000, 8_000_000,
                        67_108_864, 4, 3, Duration.ofSeconds(8), Duration.ofSeconds(20)));
        service.setSceneImageLoader(imageLoader);
        String phase = "odd";
        try {
            if (!"true".equals(System.getenv("RUN_CLOZE_ONLY"))) {
            var odd = (OddOneOutGameDsl) service.generate(GameType.ODD_ONE_OUT,
                    new GameDslRequest("Phân biệt trái cây và rau củ", Subject.VIETNAMESE, GradeLevel.GRADE_1,
                            null, null, VisualClozeMode.IMAGE, null, null));
            phase = "avm";
            var avm = (AudioVisualMatchGameDsl) service.generate(GameType.AUDIO_VISUAL_MATCH,
                    new GameDslRequest("Listen and select the cat or dog", Subject.ENGLISH, GradeLevel.GRADE_1,
                            null, null, VisualClozeMode.IMAGE, null, null));
            assertThat(odd.questions()).isNotEmpty();
            assertThat(avm.questions()).isNotEmpty();
            System.out.println("Synthetic Gemini results: Odd=" + odd.questions().size() + ", AVM=" + avm.questions().size());
            odd.questions().stream().limit(2).forEach(q -> System.out.println("Odd: " + q.questionText() + " / "
                    + q.items().stream().map(item -> item.text()).toList()));
            avm.questions().stream().limit(2).forEach(q -> System.out.println("AVM: " + q.audioText() + " / "
                    + q.correct().visualPrompt() + " / " + q.distractors().stream().map(item -> item.visualPrompt()).toList()));
            }
            phase = "visual-cloze";
            String sceneUrl = "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/A_group_of_ripe_bananas_sits_next_to_several_oranges.jpg/960px-A_group_of_ripe_bananas_sits_next_to_several_oranges.jpg";
            String bananaUrl = "https://upload.wikimedia.org/wikipedia/commons/3/31/Banana_Icon.png";
            String orangeUrl = "https://upload.wikimedia.org/wikipedia/commons/d/dc/Orange-fruit.png";
            phase = "scene-load";
            imageLoader.load(java.net.URI.create(sceneUrl));
            phase = "banana-load";
            imageLoader.load(java.net.URI.create(bananaUrl));
            phase = "orange-load";
            imageLoader.load(java.net.URI.create(orangeUrl));
            phase = "visual-cloze";
            var cloze = (VisualClozeGameDsl) service.generate(GameType.VISUAL_CLOZE,
                    new GameDslRequest("Nhận biết quả chuối trong tranh", Subject.VIETNAMESE, GradeLevel.GRADE_1,
                            null, null, VisualClozeMode.IMAGE,
                            sceneUrl, List.of(new GenerateGameRequest.OptionImage(bananaUrl, "Quả chuối"),
                                    new GenerateGameRequest.OptionImage(orangeUrl, "Quả cam"))));
            assertThat(cloze.questions()).isNotEmpty();
            System.out.println("Synthetic Gemini results: Visual Cloze=" + cloze.questions().size());
            cloze.questions().stream().limit(1).forEach(q -> System.out.println("Visual Cloze: " + q.questionText()
                    + " / blank=" + q.blanks().getFirst().x() + "," + q.blanks().getFirst().y()));
        } catch (RuntimeException error) {
            StringBuilder classes = new StringBuilder();
            for (Throwable cause = error; cause != null; cause = cause.getCause()) {
                if (!classes.isEmpty()) classes.append(" > ");
                classes.append(cause.getClass().getSimpleName());
                if (cause instanceof com.aigameplatform.backend.service.media.InvalidSceneImageException
                        && cause.getMessage() != null && cause.getMessage().startsWith("Scene image"))
                    classes.append(" (").append(cause.getMessage()).append(")");
                if (cause.getMessage() != null) {
                    var status = java.util.regex.Pattern.compile("\\b(?:400|401|403|404|429|500|502|503|504)\\b")
                            .matcher(cause.getMessage());
                    if (status.find()) classes.append(" (").append(status.group()).append(")");
                }
            }
            throw new AssertionError("Live Gemini " + phase + " failed: " + classes);
        } finally {
            resolver.destroy();
        }
    }
}
