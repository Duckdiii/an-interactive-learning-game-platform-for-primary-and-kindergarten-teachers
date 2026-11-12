package com.aigameplatform.backend.service.generation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.dto.dsl.*;
import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.service.curriculum.CurriculumRAGService;
import com.aigameplatform.backend.service.curriculum.CurriculumSource;
import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ImageContent;
import dev.langchain4j.model.chat.ChatModel;
import dev.langchain4j.model.chat.request.ChatRequest;
import dev.langchain4j.model.chat.response.ChatResponse;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class GeminiGeneratedContentReviewerTest {
    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final String REVIEW = """
            {"questions":[{"questionId":"q1","answerCorrect":true,"supportedByCurriculum":true,"matchesTeacherRequest":true,"uniqueCorrectAnswer":true,"supportingChunkIds":["math-g1-001"],"reason":"Supported"}]}
            """;

    @Test
    void oddImageWithoutCurriculumReviewsLabelsWithoutClaimingVisualOrCurriculumInspection() {
        var captured = new AtomicReference<ChatRequest>();
        var question = new OddOneOutQuestionDsl("q1", 30, 10, null, null, null, null,
                List.of(new TextChoiceDsl("a", "Táo", "apple", "/assets/noto/emoji_u1f34e.svg"),
                        new TextChoiceDsl("b", "Chuối", "banana", "/assets/noto/emoji_u1f34c.svg"),
                        new TextChoiceDsl("c", "Nho", "grapes", "/assets/noto/emoji_u1f347.svg"),
                        new TextChoiceDsl("d", "Cà rốt", "carrot", "/assets/noto/emoji_u1f955.svg")),
                "d", "Hình nào không phải trái cây?");
        var game = new OddOneOutGameDsl("1.1.0", GameType.ODD_ONE_OUT, OddOneOutMode.IMAGE,
                new GameMetadata("Trái cây", Subject.VIETNAMESE, GradeLevel.GRADE_1, "Trái cây"),
                new GameplaySettings(1), List.of(question));
        String response = """
                {"questions":[{"questionId":"q1","answerCorrect":true,"matchesTeacherRequest":true,
                "uniqueCorrectAnswer":true,"supportedByCurriculum":false,"supportingChunkIds":[],"reason":"Catalog labels"}]}
                """;
        var result = new GeminiGeneratedContentReviewer(model(captured, response), MAPPER, "fixture")
                .review(game, "Trái cây", CurriculumEvidence.empty());
        assertThat(result.accepted()).isTrue();
        assertThat(result.review().status()).isEqualTo(
                com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview.Status.UNAVAILABLE);
        String instruction = dev.langchain4j.data.message.SystemMessage.findFirst(captured.get().messages()).orElseThrow().text();
        assertThat(instruction).contains("curated Noto catalog", "do not claim that you visually inspected", "no curriculum chunks");
    }

    @Test
    void imageModeReviewerReceivesTheSameValidatedSceneBytes() {
        var captured = new AtomicReference<ChatRequest>();
        var image = new com.aigameplatform.backend.service.media.LoadedSceneImage(
                new byte[] {9, 8, 7}, "image/png", 320, 240);
        var optionImages = java.util.Map.of(
                "q1/o1", new com.aigameplatform.backend.service.media.LoadedSceneImage(new byte[] {1, 2}, "image/png", 32, 32),
                "q1/o2", new com.aigameplatform.backend.service.media.LoadedSceneImage(new byte[] {3, 4}, "image/jpeg", 32, 32));
        var game = new VisualClozeGameDsl("1.1.0", GameType.VISUAL_CLOZE, VisualClozeMode.IMAGE,
                new GameMetadata("Animals", Subject.ENGLISH, GradeLevel.GRADE_1, "Identify an animal"),
                new GameplaySettings(1.0), List.of(new VisualClozeQuestionDsl("q1", 30, 10, null, null,
                        null, null, null, null, null, "Which animal is shown?", "https://images.example.edu/scene.png",
                        320, 240, List.of(new VisualClozeBlankDsl("b1", 100, 90, "o1")),
                        List.of(new VisualClozeImageOptionDsl("o1", "cat", "https://images.example.edu/cat.png"),
                                new VisualClozeImageOptionDsl("o2", "dog", "https://images.example.edu/dog.png")))));
        var reviewer = new GeminiGeneratedContentReviewer(model(captured, REVIEW), MAPPER, "fixture");

        assertThat(reviewer.review(game, "Identify an animal", evidence(), image, optionImages).accepted()).isTrue();

        var userMessage = dev.langchain4j.data.message.UserMessage.findLast(captured.get().messages()).orElseThrow();
        var actualImages = userMessage.contents().stream().filter(ImageContent.class::isInstance)
                .map(ImageContent.class::cast).toList();
        assertThat(actualImages).hasSize(3);
        var actual = actualImages.getFirst();
        assertThat(actual.image().base64Data()).isEqualTo(java.util.Base64.getEncoder().encodeToString(image.bytes()));
        assertThat(actual.image().mimeType()).isEqualTo("image/png");
        assertThat(actualImages.get(1).image().base64Data()).isEqualTo(java.util.Base64.getEncoder().encodeToString(optionImages.get("q1/o1").bytes()));
        assertThat(actualImages.get(2).image().base64Data()).isEqualTo(java.util.Base64.getEncoder().encodeToString(optionImages.get("q1/o2").bytes()));
        assertThat(actualImages.get(2).image().mimeType()).isEqualTo("image/jpeg");
        assertThat(userMessage.toString()).contains("sceneImageUrl", "optionImageAssets", "q1/o1", "q1/o2");
    }

    @Test
    void imageModeReviewerFailsClosedWhenAnyOptionImageBytesAreMissing() {
        var imageGame = imageGame();
        var scene = new com.aigameplatform.backend.service.media.LoadedSceneImage(new byte[] {9}, "image/png", 320, 240);
        assertThatThrownBy(() -> new GeminiGeneratedContentReviewer(model(new AtomicReference<>(), REVIEW), MAPPER, "fixture")
                .review(imageGame, "Identify an animal", evidence(), scene, java.util.Map.of("q1/o1", scene)))
                .isInstanceOf(AiServiceUnavailableException.class);
    }

    @Test
    void imageModeReviewerFailsClosedWhenSceneBytesAreMissing() {
        var imageGame = imageGame();
        assertThatThrownBy(() -> new GeminiGeneratedContentReviewer(model(new AtomicReference<>(), REVIEW), MAPPER, "fixture")
                .review(imageGame, "Identify an animal", evidence()))
                .isInstanceOf(AiServiceUnavailableException.class);
    }

    private static VisualClozeGameDsl imageGame() {
        return new VisualClozeGameDsl("1.1.0", GameType.VISUAL_CLOZE, VisualClozeMode.IMAGE,
                new GameMetadata("Animals", Subject.ENGLISH, GradeLevel.GRADE_1, "Identify an animal"),
                new GameplaySettings(1.0), List.of(new VisualClozeQuestionDsl("q1", 30, 10, null, null,
                        null, null, null, null, null, "Which animal is shown?", "https://images.example.edu/scene.png",
                        320, 240, List.of(new VisualClozeBlankDsl("b1", 100, 90, "o1")),
                        List.of(new VisualClozeImageOptionDsl("o1", "cat", "https://images.example.edu/cat.png"),
                                new VisualClozeImageOptionDsl("o2", "dog", "https://images.example.edu/dog.png")))));
    }

    @Test
    void savedOrderingDraftIsPresentedInSolutionOrderWithoutMutatingTheDisplayedGame() throws Exception {
        var game = savedOrderingGame();
        var captured = new AtomicReference<ChatRequest>();
        var reviewer = new GeminiGeneratedContentReviewer(model(captured,
                orderingReview(true, true)), MAPPER, "fixture");
        assertThat(reviewer.review(game, game.metadata().topic(), orderingEvidence()).accepted()).isTrue();
        var input = MAPPER.readTree(dev.langchain4j.data.message.UserMessage.findLast(captured.get().messages())
                .orElseThrow().singleText());
        assertThat(input.path("orderingAnswers").path("q1").values().stream().map(n -> n.path("text").asString()).toList())
                .containsExactly("345", "453", "534", "543");
        assertThat(game.questions().getFirst().steps()).extracting(OrderStepDsl::text)
                .containsExactly("345", "453", "543", "534");
        String system = dev.langchain4j.data.message.SystemMessage.findFirst(captured.get().messages()).orElseThrow().text();
        assertThat(system).contains("display order", "correctPosition", "orderingAnswers", "not approval", "numeric", "curriculum");
    }

    @Test
    void correctOrderingProjectionCannotOverrideMissingGroundingOrAnIncorrectSolutionVerdict() {
        for (var response : List.of(orderingReview(true, false), orderingReview(false, true))) {
            var reviewer = new GeminiGeneratedContentReviewer(model(new AtomicReference<>(), response), MAPPER, "fixture");
            assertThat(reviewer.review(savedOrderingGame(), savedOrderingGame().metadata().topic(), orderingEvidence()).accepted()).isFalse();
        }
    }

    @Test
    void savedPreschoolFurnitureQuestionsRequireMaterialFactsAndKeepTeacherReadDelivery() {
        var questions = List.of(
                new QuizQuestionDsl("q1",30,10,null,null,null,null,
                        "Cô đọc tên các đồ vật sau: cái bàn, cái ghế, cái tủ. Các con hãy cho biết đó là nhóm gì?",
                        List.of(new TextChoiceDsl("a","Con vật"),new TextChoiceDsl("b","Đồ gỗ")),"b"),
                new QuizQuestionDsl("q5",30,10,null,null,null,null,
                        "Cô đọc tên các đồ vật sau: cái giường, cái tủ, cái bàn. Các con hãy cho biết đó là nhóm gì?",
                        List.of(new TextChoiceDsl("a","Đồ gỗ"),new TextChoiceDsl("b","Rau quả")),"a"));
        var game = new QuizGameDsl("1.0.0",GameType.QUIZ,
                new GameMetadata("Nghe cô đọc",Subject.VIETNAMESE,GradeLevel.KINDERGARTEN,"Cô đọc, trẻ nghe và chọn nhóm đồ gỗ"),
                new GameplaySettings(1),questions);
        var source = new CurriculumSource("01-VBHN-BGDĐT-2021.pdf","b".repeat(64),"01/VBHN-BGDĐT","kindergarten-outcomes-v1",84);
        var evidence = CurriculumEvidence.from(source,"fixture",List.of(new CurriculumRAGService.RetrievedChunk(
                "kg-lang-vocabulary-45",Subject.VIETNAMESE,GradeLevel.KINDERGARTEN,"Ngôn ngữ / Từ khái quát",
                "1.2. Hiểu nghĩa từ khái quát: rau quả, con vật, đồ gỗ…",.9,source.sourceDocument(),List.of(68),List.of(80),
                source.curriculumVersion(),"LANGUAGE","LISTENING|VOCABULARY","AGE_4_5")));
        var captured = new AtomicReference<ChatRequest>();
        String response = "{\"questions\":[{\"questionId\":\"q1\",\"answerCorrect\":false,\"supportedByCurriculum\":true,\"supportingChunkIds\":[\"kg-lang-vocabulary-45\"],\"reason\":\"Material not stated\"},{\"questionId\":\"q5\",\"answerCorrect\":false,\"supportedByCurriculum\":true,\"supportingChunkIds\":[\"kg-lang-vocabulary-45\"],\"reason\":\"Material not stated\"}]}";
        var reviewer = new GeminiGeneratedContentReviewer(model(captured,response),MAPPER,"fixture");
        assertThat(reviewer.review(game,game.metadata().topic(),evidence).accepted()).isFalse();
        String system=dev.langchain4j.data.message.SystemMessage.findFirst(captured.get().messages()).orElseThrow().text();
        assertThat(system).contains("material", "not necessarily wooden", "answerCorrect", "category", "teacher reads");
        assertThat(questions.getFirst().questionText()).doesNotContain("bằng gỗ");
    }

    // Minimized exact ORDERING draft from three-case-live-2026-11-02-01.json (not an invented replacement).
    private static OrderingGameDsl savedOrderingGame() {
        return new OrderingGameDsl("1.0.0",GameType.ORDERING,
                new GameMetadata("Sắp xếp số",Subject.MATH,GradeLevel.GRADE_2,
                        "Sắp xếp nhóm 4 số tự nhiên khác nhau trong phạm vi 1000 từ bé đến lớn"),
                new GameplaySettings(1),List.of(new OrderingQuestionDsl("q1",30,10,null,null,null,null,List.of(
                        new OrderStepDsl("s1","345",null,null,1),new OrderStepDsl("s2","453",null,null,2),
                        new OrderStepDsl("s3","543",null,null,4),new OrderStepDsl("s4","534",null,null,3)))));
    }
    private static CurriculumEvidence orderingEvidence() {
        var source=new CurriculumSource("Thông-tư-32-2018-TT-BGDĐT.pdf","c".repeat(64),"32/2018/TT-BGDDT","math-grade2-draft-v1",1555);
        return CurriculumEvidence.from(source,"fixture",List.of(new CurriculumRAGService.RetrievedChunk("math-g2-008",
                Subject.MATH,GradeLevel.GRADE_2,"So sánh các số",
                "Thực hiện được việc sắp xếp các số theo thứ tự (từ bé đến lớn hoặc ngược lại) trong một nhóm có không quá 4 số (trong phạm vi 1000).",
                .9,source.sourceDocument(),List.of(191),List.of(25),source.curriculumVersion())));
    }
    private static String orderingReview(boolean correct,boolean supported) {
        return "{\"questions\":[{\"questionId\":\"q1\",\"answerCorrect\":"+correct+",\"matchesTeacherRequest\":true,\"uniqueCorrectAnswer\":true,\"supportedByCurriculum\":"+supported
                +",\"supportingChunkIds\":[\"math-g2-008\"],\"reason\":\"Fixture verdict, never automatically overridden\"}]}";
    }

    @Test
    void acceptsOnlyACompleteReviewCitingRetrievedEvidence() {
        AtomicReference<ChatRequest> request = new AtomicReference<>();
        var reviewer = new GeminiGeneratedContentReviewer(model(request, REVIEW), MAPPER, "review-model");

        var result = reviewer.review(game(), "count to five", evidence());

        assertThat(result.accepted()).isTrue();
        assertThat(result.review().status()).isEqualTo(
                com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview.Status.PENDING);
        assertThat(result.review().warnings()).contains("AUTOMATED_REVIEW_ONLY_HUMAN_REVIEW_PENDING");
        assertThat(result.review().reviewerModel()).isEqualTo("review-model");
        assertThat(request.get().parameters().responseFormat()).isNotNull();
    }

    @Test
    void reviewerExplainsGameSpecificAnswerStructuresAndDoesNotAssumeMediaWasCreated() {
        AtomicReference<ChatRequest> request = new AtomicReference<>();
        var reviewer = new GeminiGeneratedContentReviewer(model(request, REVIEW), MAPPER, "review-model");

        reviewer.review(game(), "count to five", evidence());

        String systemPrompt = dev.langchain4j.data.message.SystemMessage
                .findFirst(request.get().messages()).orElseThrow().text();
        assertThat(systemPrompt).contains("correctOptionId", "pairs", "targetZoneId", "correctPosition",
                "scrambledLetters", "oddOneOutId", "sentenceTemplate", "targetDescription",
                "visualPrompt", "audioText")
                .contains("they do not mean an image or audio asset exists");
    }

    @Test
    void rejectsReviewThatCitesAChunkOutsideTheRetrievedEvidence() {
        String inventedChunk = REVIEW.replace("math-g1-001", "math-g2-001");
        var reviewer = new GeminiGeneratedContentReviewer(model(new AtomicReference<>(), inventedChunk), MAPPER, "review-model");

        var result = reviewer.review(game(), "count to five", evidence());

        assertThat(result.accepted()).isFalse();
        assertThat(result.errors()).extracting(e -> e.path()).contains("$.questions[0].questionText");
    }

    @Test
    void failsClosedWhenReviewerOmitsAQuestion() {
        var reviewer = new GeminiGeneratedContentReviewer(model(new AtomicReference<>(), "{\"questions\":[]}"), MAPPER, "review-model");

        assertThatThrownBy(() -> reviewer.review(game(), "count to five", evidence()))
                .isInstanceOf(AiServiceUnavailableException.class);
    }

    @Test
    void rejectsSkillDriftAndNonUniqueAnswersEvenWhenOutcomeAndAnswerAreMarkedSupported() {
        for (String field : List.of("matchesTeacherRequest", "uniqueCorrectAnswer")) {
            String output = REVIEW.replace("\"" + field + "\":true", "\"" + field + "\":false");
            var result = new GeminiGeneratedContentReviewer(model(new AtomicReference<>(), output), MAPPER, "fixture")
                    .review(game(), "count to five", evidence());
            assertThat(result.accepted()).as(field).isFalse();
        }
    }

    @Test
    void emptyOrUnavailableReviewCannotPassTheGenerationGate() {
        assertThat(new GeneratedContentReviewer.Result(List.of(), null).accepted()).isFalse();
        assertThat(new GeneratedContentReviewer.Result(List.of(),
                com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview.unavailable()).accepted()).isFalse();
    }

    private static ChatModel model(AtomicReference<ChatRequest> request, String responseText) {
        return new ChatModel() {
            @Override public ChatResponse doChat(ChatRequest chatRequest) {
                request.set(chatRequest);
                return ChatResponse.builder().aiMessage(AiMessage.from(responseText)).build();
            }
        };
    }

    private static QuizGameDsl game() {
        var question = new QuizQuestionDsl("q1", 30, 10, null, null, null, null, "How many dots?",
                List.of(new TextChoiceDsl("a", "5"), new TextChoiceDsl("b", "4")), "a");
        return new QuizGameDsl("1.0.0", GameType.QUIZ,
                new GameMetadata("Counting", Subject.MATH, GradeLevel.GRADE_1, "count to five"),
                new GameplaySettings(1.0), List.of(question));
    }

    private static CurriculumEvidence evidence() {
        var source = new CurriculumSource("program.pdf", "a".repeat(64), "32/2018/TT-BGDDT", "math-g1-v1", 200);
        var chunk = new CurriculumRAGService.RetrievedChunk("math-g1-001", Subject.MATH, GradeLevel.GRADE_1,
                "Counting", "Count numbers to 10", 0.91, "program.pdf", List.of(1), List.of(1), "32/2018/TT-BGDDT");
        return CurriculumEvidence.from(source, "fixture", List.of(chunk));
    }
}
