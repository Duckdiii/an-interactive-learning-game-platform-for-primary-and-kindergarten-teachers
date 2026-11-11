package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.QuestionDsl;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
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

    // Rút từ lỗi thật khi chạy 12 kịch bản đầu (docs/Kịch bản/Kịch bản tạo game): tên game chép nguyên câu, câu lặp,
    // mọi màn cùng đáp án, lộ đáp án trong lời dẫn. Luật Lớp 2 (RuleSupport) bắt lại các lỗi kiểm được bằng máy.
    static final String COMMON_CONTENT_RULES = """
            Quy tắc chung:
            - title: tên game ngắn 2-8 từ, hấp dẫn với trẻ, đặt lại từ chủ đề; không chép nguyên câu yêu cầu của giáo viên.
            - Các câu (màn) không được trùng nhau, kể cả khi chỉ đổi động từ ("Tìm..."/"Chạm...").
            - Với game mỗi câu có một đáp án đúng: đáp án đúng phải thay đổi giữa các câu, không để mọi câu cùng một đáp án.
            - Câu điền khuyết: dùng "..." thay chỗ cần điền, không viết lại từ hoàn chỉnh ở bất kỳ đâu trong câu.
            - Không viết đáp án, hoặc từ hoàn chỉnh chứa đáp án, ngay trong lời dẫn câu hỏi.
            - Chỉ dùng từ có thật, viết đúng chính tả (tiếng Việt; nội dung tiếng Anh cần học thì đúng chính tả tiếng Anh).
            - Ngôn ngữ: title, câu hỏi, lời dẫn, câu mẫu và mô tả hình (visualPrompt) luôn viết bằng tiếng Việt, \
            kể cả khi giáo viên viết yêu cầu bằng tiếng Anh. Riêng môn Tiếng Anh: nội dung trẻ cần học (lựa chọn, \
            vế nối, từ cần xếp, đáp án) viết bằng tiếng Anh; lời dẫn tiếng Việt được chèn từ tiếng Anh cần học, \
            ví dụ câu hỏi "Bé chọn quả bóng màu red", lựa chọn "red", "blue".""";

    static final String KINDERGARTEN_LABEL_RULE =
            "- Mầm non: mỗi lựa chọn/vế chỉ 1-3 từ hoặc 1 chữ cái/chữ số (ví dụ 'ă', 'Con cá'), không viết câu mô tả như 'Chữ A in hoa'.";

    protected String id;

    protected String promptTemplate;

    private String jsonSchemaDefinition;

    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private final Class<D> dslType;

    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private final Class<E> entityType;

    // Tiêm qua constructor (Spring quản lý) thay vì tự new JsonMapper: dùng chung cấu hình Jackson với
    // AiOutputValidator, GameValidationService... để hành vi đọc JSON nhất quán trong toàn bộ ứng dụng.
    @Getter(AccessLevel.NONE)
    @Setter(AccessLevel.NONE)
    private final JsonMapper jsonMapper;

    protected GameContentStrategy(Class<D> dslType, Class<E> entityType, JsonMapper jsonMapper) {
        this.dslType = dslType;
        this.entityType = entityType;
        this.jsonMapper = jsonMapper;
    }

    public String buildPrompt(String topic, GradeLevel grade) {
        if (promptTemplate == null) {
            throw new IllegalStateException("promptTemplate chưa được cấu hình cho " + getSupportedType());
        }
        return promptTemplate + "\n\n" + buildTypeSpecificInstruction(topic, grade);
    }

    /** Adds reviewed curriculum evidence while preserving all existing two-argument callers. */
    public String buildPrompt(String topic, GradeLevel grade, String curriculumContext) {
        String prompt = buildPrompt(topic, grade);
        if (curriculumContext == null || curriculumContext.isBlank()) return prompt;
        return appendCurriculumContext(prompt, curriculumContext);
    }

    /** Builds a scope-aware prompt for generation while preserving legacy two/three-argument callers. */
    public String buildPrompt(String topic, Subject subject, GradeLevel grade, String curriculumContext) {
        if (promptTemplate == null) {
            throw new IllegalStateException("promptTemplate chưa được cấu hình cho " + getSupportedType());
        }
        String scope = "Phạm vi yêu cầu:\nMôn: " + (subject == null ? "không cung cấp" : subject.name())
                + "\nLớp/độ tuổi: " + grade + "\nChủ đề giáo viên: " + topic
                + "\nGiữ đúng môn, lớp/độ tuổi, kỹ năng và phạm vi được yêu cầu; không tự đổi sang môn hoặc lớp khác."
                + "\n\n" + COMMON_CONTENT_RULES
                + (grade == GradeLevel.KINDERGARTEN && hasShortChoiceLabels() ? "\n" + KINDERGARTEN_LABEL_RULE : "");
        String prompt = promptTemplate + "\n\n" + scope + "\n\n" + buildTypeSpecificInstruction(topic, grade);
        return appendCurriculumContext(prompt, curriculumContext);
    }

    private static String appendCurriculumContext(String prompt, String curriculumContext) {
        if (curriculumContext == null || curriculumContext.isBlank()) return prompt;
        return prompt + "\n\n" + """
                CĂN CỨ CHƯƠNG TRÌNH:
                Dùng các YCCĐ dưới đây làm căn cứ nội dung. Giữ đúng kỹ năng, điều kiện và giới hạn được nêu;
                không tự mở rộng kiến thức ngoài nguồn. Không đổi cơ chế game hoặc schema đầu ra để ép nội dung
                thành trắc nghiệm hay phép tính. Nếu nguồn không hỗ trợ yêu cầu, không bịa thêm YCCĐ.
                visualPrompt và audioText chỉ là mô tả/chỉ dẫn văn bản, không chứng minh ảnh hay âm thanh đã được tạo.
                <curriculum_context>
                """ + curriculumContext + "\n</curriculum_context>";
    }

    /** Schema "dạng đầu ra của AI" của loại game này, đưa cho LLM làm Structured Outputs. */
    public String getStructuredSchema() {
        if (jsonSchemaDefinition == null) {
            jsonSchemaDefinition = AiOutputSchemas.forLlm(getSupportedType());
        }
        return jsonSchemaDefinition;
    }

    protected abstract String buildTypeSpecificInstruction(String topic, GradeLevel grade);

    /** Loại game mà trẻ chọn giữa các nhãn ngắn (lựa chọn, vế cặp): Mầm non thì nhãn phải rất ngắn. */
    protected boolean hasShortChoiceLabels() {
        return false;
    }

    public abstract GameType getSupportedType();

    // ---- Game DSL -> entity ----

    /** Đọc Game DSL đầy đủ dạng JSON rồi dựng các entity câu hỏi (chưa lưu, id để Hibernate sinh). */
    public List<QuestionGame> parseToQuestions(String rawJson) {
        GameDsl game;
        try {
            game = jsonMapper.readValue(rawJson, GameDsl.class);
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
            // Id trong DSL theo vị trí (q1, q2...) vì schema chỉ nhận dạng này; id lưu trong DB (UUID) không đưa vào DSL.
            result.add(toDsl(entityType.cast(question), Ids.numbered("q", i)));
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
