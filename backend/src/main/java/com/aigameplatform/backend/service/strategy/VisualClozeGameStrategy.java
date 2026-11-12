package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeQuestionDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeBlankDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeImageOptionDsl;
import com.aigameplatform.backend.dto.dsl.QuestionDsl;
import com.aigameplatform.backend.dto.request.GenerateGameRequest;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.question.embedded.VisualClozeBlank;
import com.aigameplatform.backend.entity.question.embedded.VisualClozeImageOption;
import com.aigameplatform.backend.entity.question.VisualClozeQuestion;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import tools.jackson.databind.json.JsonMapper;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class VisualClozeGameStrategy extends GameContentStrategy<VisualClozeQuestionDsl, VisualClozeQuestion> {

    public VisualClozeGameStrategy(JsonMapper jsonMapper) {
        super(VisualClozeQuestionDsl.class, VisualClozeQuestion.class, jsonMapper);
        setPromptTemplate("""
                Bạn tạo game VISUAL_CLOZE: người học hoàn thành câu có một chỗ trống dựa trên ngữ cảnh học tập.
                Dùng sentenceTemplate với đúng một dấu ___, correctAnswer và distractors theo schema hiện có.
                Đáp án phải hoàn thành câu đúng và được YCCĐ hỗ trợ; distractors phải sai trong ngữ cảnh nhưng cùng mức độ.
                visualPrompt chỉ mô tả gợi ý hình ảnh mong muốn, không có nghĩa hình ảnh đã được tạo.
                Chỉ trả JSON theo schema.
                """);
    }

    public String buildImagePrompt(String topic, com.aigameplatform.backend.entity.enums.Subject subject,
            GradeLevel grade, String curriculumContext, int sceneWidth, int sceneHeight) {
        return buildImagePrompt(topic, subject, grade, curriculumContext, sceneWidth, sceneHeight, List.of());
    }

    public String buildImagePrompt(String topic, com.aigameplatform.backend.entity.enums.Subject subject,
            GradeLevel grade, String curriculumContext, int sceneWidth, int sceneHeight,
            List<GenerateGameRequest.OptionImage> optionImages) {
        String assets = optionImages == null ? "" : optionImages.stream()
                .map(asset -> "- imageUrl: " + asset.imageUrl() + " | visualPrompt: " + asset.visualPrompt())
                .collect(java.util.stream.Collectors.joining("\n"));
        String scope = "IMAGE MODE REQUEST:\nSubject: " + subject + "\nGrade: " + grade + "\nTeacher topic: " + topic
                + "\nKeep the requested subject, grade, skill, and scope.\n" + buildTypeSpecificInstruction(topic, grade);
        String curriculum = curriculumContext == null || curriculumContext.isBlank() ? "" : "\n\n" + """
                CURRICULUM EVIDENCE:
                Use only the following reviewed outcomes as curriculum support. Preserve their skill and limits; do not invent outcomes.
                <curriculum_context>
                """ + curriculumContext + "\n</curriculum_context>";
        return """
                Create a children's learning game in VISUAL_CLOZE IMAGE mode.
                Return only JSON matching the supplied IMAGE schema. Do not include TEXT-mode fields such as sentenceTemplate, correctAnswer, or distractors.
                """ + "\n\n" + scope + curriculum + "\n\n" + """
                IMAGE MODE:
                Inspect the actual scene image attached to the user message. Use only objects visibly present in it.
                Return questionText, blanks, and options. Each blank must point to the center of the visible object
                to be filled, in source-image pixel coordinates within %d by %d pixels. Use unique blank and option IDs.
                Every blank must map to one distinct correct option ID. Use only the teacher-provided option assets listed below.
                For each output option, copy its imageUrl and visualPrompt exactly. Do not invent URLs or create images.
                Do not return the scene URL or dimensions; the backend supplies both from the validated image.
                Keep curriculum support separate from visual inspection and never invent a curriculum outcome.
                Teacher-provided option assets:
                %s
                """.formatted(sceneWidth, sceneHeight, assets);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        return "Chủ đề: " + topic + ". Dùng từ và cấu trúc câu phù hợp " + grade
                + "; không yêu cầu suy luận từ một hình ảnh chưa hiện hữu hoặc kiến thức ngoài căn cứ.";
    }

    @Override
    protected VisualClozeQuestion toEntity(VisualClozeQuestionDsl dsl) {
        VisualClozeQuestion question = new VisualClozeQuestion();
        question.setSentenceTemplate(dsl.sentenceTemplate());
        question.setCorrectAnswer(dsl.correctAnswer());
        question.setDistractors(dsl.distractors() == null ? new ArrayList<>() : new ArrayList<>(dsl.distractors()));
        question.setQuestionText(dsl.questionText());
        question.setSceneWidth(dsl.sceneWidth());
        question.setSceneHeight(dsl.sceneHeight());
        if (dsl.blanks() != null) {
            question.setBlanks(dsl.blanks().stream().map(blank -> new VisualClozeBlank(blank.id(), blank.x(),
                    blank.y(), blank.correctOptionId())).toList());
        }
        if (dsl.options() != null) {
            question.setOptions(dsl.options().stream().map(option -> new VisualClozeImageOption(option.id(),
                    option.visualPrompt(), option.imageUrl())).toList());
        }
        return question;
    }

    @Override
    protected VisualClozeQuestionDsl toDsl(VisualClozeQuestion entity, String questionId) {
        if (entity.getSceneWidth() != null || entity.getSceneHeight() != null
                || entity.getBlanks() != null && !entity.getBlanks().isEmpty()
                || entity.getOptions() != null && !entity.getOptions().isEmpty()) {
            return new VisualClozeQuestionDsl(questionId, entity.getTimeLimit(), entity.getPoint(), entity.getAudioText(),
                    entity.getAudioUrl(), entity.getVisualPrompt(), null, null, null, null, entity.getQuestionText(),
                    entity.getImageUrl(), entity.getSceneWidth(), entity.getSceneHeight(),
                    entity.getBlanks().stream().map(blank -> new VisualClozeBlankDsl(blank.getBlankId(), blank.getX(),
                            blank.getY(), blank.getCorrectOptionId())).toList(),
                    entity.getOptions().stream().map(option -> new VisualClozeImageOptionDsl(option.getOptionId(),
                            option.getVisualPrompt(), option.getImageUrl())).toList());
        }
        return new VisualClozeQuestionDsl(questionId, entity.getTimeLimit(), entity.getPoint(), entity.getAudioText(),
                entity.getAudioUrl(), entity.getVisualPrompt(), entity.getImageUrl(), entity.getSentenceTemplate(),
                entity.getCorrectAnswer(), List.copyOf(entity.getDistractors()));
    }

    @Override
    protected GameDsl assemble(
            GameMetadata metadata, GameplaySettings settings, List<VisualClozeQuestionDsl> questions) {
        boolean imageMode = questions.stream().anyMatch(question -> question.sceneImageUrl() != null);
        if (imageMode) {
            return new VisualClozeGameDsl(GameDslSchemaRegistry.VISUAL_CLOZE_IMAGE_VERSION, GameType.VISUAL_CLOZE,
                    VisualClozeMode.IMAGE, metadata, settings, questions);
        }
        return new VisualClozeGameDsl(GameDslSchemaRegistry.SUPPORTED_VERSION, GameType.VISUAL_CLOZE, metadata,
                settings, questions);
    }

    @Override
    protected GameDsl assemble(Game game, GameMetadata metadata,
            GameplaySettings settings, List<VisualClozeQuestionDsl> questions) {
        boolean hasImageData = questions.stream().anyMatch(question -> question.sceneImageUrl() != null);
        VisualClozeMode persistedMode = game.getVisualClozeMode() == null && hasImageData
                ? VisualClozeMode.IMAGE
                : game.effectiveVisualClozeMode();
        if (persistedMode == VisualClozeMode.IMAGE) {
            return new VisualClozeGameDsl(GameDslSchemaRegistry.VISUAL_CLOZE_IMAGE_VERSION, GameType.VISUAL_CLOZE,
                    VisualClozeMode.IMAGE, metadata, settings, questions);
        }
        String persistedVersion = GameDslSchemaRegistry.VISUAL_CLOZE_IMAGE_VERSION.equals(game.getSchemaVersion())
                ? GameDslSchemaRegistry.VISUAL_CLOZE_IMAGE_VERSION
                : GameDslSchemaRegistry.SUPPORTED_VERSION;
        if (GameDslSchemaRegistry.SUPPORTED_VERSION.equals(persistedVersion)) {
            return new VisualClozeGameDsl(persistedVersion, GameType.VISUAL_CLOZE, metadata, settings, questions);
        }
        return new VisualClozeGameDsl(persistedVersion, GameType.VISUAL_CLOZE, VisualClozeMode.TEXT,
                metadata, settings, questions);
    }

    @Override
    protected String imageUrl(VisualClozeQuestionDsl dsl) {
        return dsl.sceneImageUrl() == null ? dsl.imageUrl() : dsl.sceneImageUrl();
    }

    @Override
    public GameType getSupportedType() {
        return GameType.VISUAL_CLOZE;
    }
}
