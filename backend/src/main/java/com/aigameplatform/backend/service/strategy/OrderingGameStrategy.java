package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.GameMetadata;
import com.aigameplatform.backend.dto.dsl.GameplaySettings;
import com.aigameplatform.backend.dto.dsl.OrderStepDsl;
import com.aigameplatform.backend.dto.dsl.OrderingGameDsl;
import com.aigameplatform.backend.dto.dsl.OrderingQuestionDsl;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.question.OrderStep;
import com.aigameplatform.backend.entity.question.OrderingQuestion;
import com.aigameplatform.backend.service.factory.Ids;
import com.aigameplatform.backend.service.validation.GameDslSchemaRegistry;
import tools.jackson.databind.json.JsonMapper;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class OrderingGameStrategy extends GameContentStrategy<OrderingQuestionDsl, OrderingQuestion> {

    public OrderingGameStrategy(JsonMapper jsonMapper) {
        super(OrderingQuestionDsl.class, OrderingQuestion.class, jsonMapper);
    }

    @Override
    protected String buildTypeSpecificInstruction(String topic, GradeLevel grade) {
        // TODO: điền theo JSON DSL Schema v1.0.0 khi có tài liệu contract.
        throw new UnsupportedOperationException("Chưa cài đặt buildTypeSpecificInstruction cho ORDERING");
    }

    /**
     * OrderStep là aggregation (không cascade): các bước dựng ra ở đây chưa có id và phải được lưu riêng trước khi
     * lưu câu hỏi. Entity chỉ giữ thứ tự đúng (correctPosition), không giữ thứ tự hiển thị của DSL.
     */
    @Override
    protected OrderingQuestion toEntity(OrderingQuestionDsl dsl) {
        List<OrderStep> steps = new ArrayList<>();
        for (OrderStepDsl stepDsl : dsl.steps()) {
            OrderStep step = new OrderStep();
            step.setText(stepDsl.text());
            step.setVisualPrompt(stepDsl.visualPrompt());
            step.setImageUrl(stepDsl.imageUrl());
            step.setCorrectPosition(stepDsl.correctPosition());
            steps.add(step);
        }
        steps.sort(Comparator.comparingInt(OrderStep::getCorrectPosition));
        OrderingQuestion question = new OrderingQuestion();
        question.setSteps(steps);
        return question;
    }

    /**
     * Thứ tự hiển thị không được lưu nên dựng lại bằng cách dịch vòng một vị trí: luôn khác thứ tự đúng khi có từ 2
     * bước trở lên (đúng luật Layer 2) và ổn định giữa các lần đọc.
     */
    @Override
    protected OrderingQuestionDsl toDsl(OrderingQuestion entity, String questionId) {
        List<OrderStep> sorted = entity.getSteps().stream()
                .sorted(Comparator.comparingInt(OrderStep::getCorrectPosition)).toList();
        List<OrderStepDsl> display = new ArrayList<>();
        for (int i = 0; i < sorted.size(); i++) {
            OrderStep step = sorted.get((i + 1) % sorted.size());
            // Id bước theo vị trí hiển thị (s1, s2...) vì schema chỉ nhận dạng này.
            display.add(new OrderStepDsl(Ids.numbered("s", i), step.getText(), step.getVisualPrompt(), step.getImageUrl(),
                    step.getCorrectPosition()));
        }
        return new OrderingQuestionDsl(questionId, entity.getTimeLimit(), entity.getPoint(), entity.getAudioText(),
                entity.getAudioUrl(), entity.getVisualPrompt(), entity.getImageUrl(), display);
    }

    @Override
    protected GameDsl assemble(GameMetadata metadata, GameplaySettings settings, List<OrderingQuestionDsl> questions) {
        return new OrderingGameDsl(GameDslSchemaRegistry.SUPPORTED_VERSION, GameType.ORDERING, metadata, settings,
                questions);
    }

    @Override
    public GameType getSupportedType() {
        return GameType.ORDERING;
    }
}
