package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.QuestionDsl;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.service.factory.GameDefaults;
import com.aigameplatform.backend.service.factory.Ids;
import com.aigameplatform.backend.service.validation.ai.AiOutputSchemas;
import java.util.ArrayList;
import java.util.List;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.Setter;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

/**
 * Strategy của một loại game. Ngoài việc dựng prompt và cấp schema cho LLM, còn chuyển qua lại giữa Game DSL và
 * entity của loại đó: phần chung (id, thứ tự, thời gian, điểm, media) làm ở đây, phần riêng từng loại do lớp con làm.
 *
 * @param <D> một màn chơi của DSL
 * @param <E> entity tương ứng của màn chơi đó
 */
@Getter
@Setter
public abstract class GameContentStrategy<D extends QuestionDsl, E extends QuestionGame> {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    protected String id;

    protected String promptTemplate;

    private String jsonSchemaDefinition;

    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private final Class<D> dslType;

    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private final Class<E> entityType;

    protected GameContentStrategy(Class<D> dslType, Class<E> entityType) {
        this.dslType = dslType;
        this.entityType = entityType;
    }

    public String buildPrompt(String topic, GradeLevel grade) {
        if (promptTemplate == null) {
            throw new IllegalStateException("promptTemplate chưa được cấu hình cho " + getSupportedType());
        }
        return promptTemplate + "\n\n" + buildTypeSpecificInstruction(topic, grade);
    }

    /** Schema "dạng đầu ra của AI" của loại game này, đưa cho LLM làm Structured Outputs. */
    public String getStructuredSchema() {
        if (jsonSchemaDefinition == null) {
            jsonSchemaDefinition = AiOutputSchemas.forLlm(getSupportedType());
        }
        return jsonSchemaDefinition;
    }

    protected abstract String buildTypeSpecificInstruction(String topic, GradeLevel grade);

    public abstract GameType getSupportedType();

    // ---- Game DSL -> entity ----

    /** Đọc Game DSL đầy đủ dạng JSON rồi dựng các entity câu hỏi (chưa lưu, id để Hibernate sinh). */
    public List<QuestionGame> parseToQuestions(String rawJson) {
        GameDsl game;
        try {
            game = MAPPER.readValue(rawJson, GameDsl.class);
        } catch (JacksonException e) {
            throw new IllegalArgumentException("Không đọc được Game DSL: " + e.getOriginalMessage(), e);
        }
        return parseToQuestions(game);
    }

    /** Dựng entity từ DSL đã đọc sẵn (ví dụ kết quả của {@code ValidationReport.game()}). */
    public List<QuestionGame> parseToQuestions(GameDsl game) {
        requireSupportedType(game.gameType());
        List<QuestionGame> result = new ArrayList<>();
        int index = 0;
        for (QuestionDsl question : game.questions()) {
            if (!dslType.isInstance(question)) {
                throw new IllegalArgumentException("Game " + getSupportedType() + " cần màn chơi kiểu "
                        + dslType.getSimpleName() + ", nhưng nhận được " + question.getClass().getSimpleName());
            }
            D dsl = dslType.cast(question);
            E entity = toEntity(dsl);
            entity.setItemIndex(index++);
            entity.setTimeLimit(dsl.timeLimitSeconds());
            entity.setPoint(dsl.points());
            entity.setAudioText(dsl.audioText());
            entity.setAudioUrl(dsl.audioUrl());
            entity.setVisualPrompt(dsl.visualPrompt());
            entity.setImageUrl(dsl.imageUrl());
            result.add(entity);
        }
        return result;
    }

    // ---- entity -> Game DSL ----

    /**
     * Dựng lại Game DSL từ game đã lưu. Game chưa lưu chủ đề riêng nên topic lấy theo title; hitboxScale tính lại
     * theo khối lớp như lúc tạo.
     */
    public GameDsl toGameDsl(Game game) {
        requireSupportedType(game.getGameType());
        GameMetadata metadata = new GameMetadata(game.getTitle(), game.getSubject(), game.getGrade(), game.getTitle());
        GameplaySettings settings = new GameplaySettings(GameDefaults.hitboxScale(game.getGrade()));
        return assemble(metadata, settings, toQuestionDsls(game.getQuestions()));
    }

    public List<D> toQuestionDsls(List<? extends QuestionGame> questions) {
        List<D> result = new ArrayList<>();
        for (int i = 0; i < questions.size(); i++) {
            QuestionGame question = questions.get(i);
            if (!entityType.isInstance(question)) {
                throw new IllegalArgumentException("Game " + getSupportedType() + " cần câu hỏi kiểu "
                        + entityType.getSimpleName() + ", nhưng nhận được " + question.getClass().getSimpleName());
            }
            String questionId = question.getId() != null ? question.getId() : Ids.numbered("q", i);
            result.add(toDsl(entityType.cast(question), questionId));
        }
        return result;
    }

    protected abstract E toEntity(D dsl);

    /** Dựng màn chơi DSL từ entity; các trường chung (thời gian, điểm, media) đọc thẳng từ entity. */
    protected abstract D toDsl(E entity, String questionId);

    protected abstract GameDsl assemble(GameMetadata metadata, GameplaySettings settings, List<D> questions);

    private void requireSupportedType(GameType type) {
        if (type != getSupportedType()) {
            throw new IllegalArgumentException("Strategy " + getSupportedType() + " không xử lý game " + type);
        }
    }
}
