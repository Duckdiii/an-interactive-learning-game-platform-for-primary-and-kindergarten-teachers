package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl;
import com.aigameplatform.backend.dto.dsl.OddOneOutQuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.question.OddOneOutQuestion;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import tools.jackson.databind.json.JsonMapper;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class OddOneOutGameStrategy extends GameContentStrategy<OddOneOutQuestionDsl, OddOneOutQuestion> {

    public OddOneOutGameStrategy(JsonMapper jsonMapper) {
        super(OddOneOutQuestionDsl.class, OddOneOutQuestion.class, jsonMapper);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, Subject subject, GradeLevel grade) {
        return "Môn: " + subjectLabel(subject) + ", " + gradeLabel(grade) + ". Chủ đề: " + topic
                + ". Mỗi câu tạo 3–5 mục, trong đó chỉ đúng một mục khác nhóm; các mục còn lại phải cùng một tiêu chí rõ ràng. "
                + "oddOneOutIndex là vị trí từ 0 của mục khác nhóm.";
    }

    @Override
    protected OddOneOutQuestion toEntity(OddOneOutQuestionDsl dsl) {
        // Kiểm tra oddOneOutId thuộc danh sách; entity giữ id này, còn id các mục luôn theo vị trí.
        ChoiceMapping.indexOfId(dsl.items(), dsl.oddOneOutId());
        OddOneOutQuestion question = new OddOneOutQuestion();
        question.setItems(new ArrayList<>(ChoiceMapping.texts(dsl.items())));
        question.setOddOneOutId(dsl.oddOneOutId());
        return question;
    }

    @Override
    protected OddOneOutQuestionDsl toDsl(OddOneOutQuestion entity, String questionId) {
        return new OddOneOutQuestionDsl(questionId, entity.getTimeLimit(), entity.getPoint(), entity.getAudioText(),
                entity.getAudioUrl(), entity.getVisualPrompt(), entity.getImageUrl(),
                ChoiceMapping.withPositionalIds(entity.getItems()), entity.getOddOneOutId());
    }

    @Override
    protected GameDsl assemble(GameMetadata metadata, GameplaySettings settings, List<OddOneOutQuestionDsl> questions) {
        return new OddOneOutGameDsl(GameDslSchemaRegistry.SUPPORTED_VERSION, GameType.ODD_ONE_OUT, metadata, settings,
                questions);
    }

    @Override
    public GameType getSupportedType() {
        return GameType.ODD_ONE_OUT;
    }
}
