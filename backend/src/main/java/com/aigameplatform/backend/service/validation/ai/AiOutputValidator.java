package com.aigameplatform.backend.service.validation.ai;

import com.aigameplatform.backend.dto.dsl.ai.AiGameOutput;
import com.aigameplatform.backend.dto.dsl.ai.AiQuestion;
import com.aigameplatform.backend.dto.dsl.ai.AudioVisualMatchAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.DragDropAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.MatchingAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.MemoryCardAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.OddOneOutAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.OrderingAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.QuizAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.SpotTheTargetAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.VisualClozeAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.WordScrambleAiOutput;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.service.validation.ValidationError;
import com.networknt.schema.Error;
import com.networknt.schema.InputFormat;
import com.networknt.schema.Schema;
import com.networknt.schema.SchemaRegistry;
import com.networknt.schema.SchemaRegistryConfig;
import com.networknt.schema.SpecificationVersion;
import com.networknt.schema.path.PathType;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Kiểm tra JSON thô do AI trả về (chưa có vỏ, chưa có id) trước khi Backend bổ sung thành DSL hoàn chỉnh.
 * Lỗi ở đây luôn thuộc loại INVALID: cho AI sinh lại kèm thông báo lỗi.
 */
@Component
public class AiOutputValidator {

    private static final Map<GameType, Class<? extends AiGameOutput>> OUTPUT_CLASSES = Map.of(
            GameType.QUIZ, QuizAiOutput.class,
            GameType.AUDIO_VISUAL_MATCH, AudioVisualMatchAiOutput.class,
            GameType.ODD_ONE_OUT, OddOneOutAiOutput.class,
            GameType.SPOT_THE_TARGET, SpotTheTargetAiOutput.class,
            GameType.WORD_SCRAMBLE, WordScrambleAiOutput.class,
            GameType.MATCHING, MatchingAiOutput.class,
            GameType.MEMORY_CARD, MemoryCardAiOutput.class,
            GameType.DRAG_DROP, DragDropAiOutput.class,
            GameType.ORDERING, OrderingAiOutput.class,
            GameType.VISUAL_CLOZE, VisualClozeAiOutput.class);

    private final Map<GameType, Schema> schemas = new EnumMap<>(GameType.class);
    private final JsonMapper jsonMapper;

    public AiOutputValidator(JsonMapper jsonMapper) {
        this.jsonMapper = jsonMapper;
        SchemaRegistry registry = SchemaRegistry.withDefaultDialect(SpecificationVersion.DRAFT_2020_12,
                builder -> builder.schemaRegistryConfig(
                        SchemaRegistryConfig.builder().pathType(PathType.JSON_PATH).build()));
        for (GameType type : GameType.values()) {
            schemas.put(type, registry.getSchema(AiOutputSchemas.rawJson(type), InputFormat.JSON));
        }
    }

    public AiOutputReport validate(GameType type, String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return failed("Không có nội dung JSON");
        }
        JsonNode json;
        try {
            json = jsonMapper.readTree(rawJson);
        } catch (JacksonException e) {
            return failed("Không phải JSON hợp lệ: " + e.getOriginalMessage());
        }

        List<Error> schemaErrors = schemas.get(type).validate(json);
        if (!schemaErrors.isEmpty()) {
            return new AiOutputReport(schemaErrors.stream()
                    .map(e -> new ValidationError(e.getInstanceLocation().toString(), e.getMessage()))
                    .toList(), null);
        }

        AiGameOutput output;
        try {
            output = jsonMapper.treeToValue(json, OUTPUT_CLASSES.get(type));
        } catch (JacksonException e) {
            return failed("Không đọc được JSON thành kết quả của AI: " + e.getOriginalMessage());
        }

        List<ValidationError> problems = new ArrayList<>();
        List<? extends AiQuestion> questions = output.questions();
        for (int i = 0; i < questions.size(); i++) {
            for (String problem : questions.get(i).problems()) {
                problems.add(new ValidationError("$.questions[" + i + "]", problem));
            }
        }
        return new AiOutputReport(problems, problems.isEmpty() ? output : null);
    }

    private static AiOutputReport failed(String message) {
        return new AiOutputReport(List.of(new ValidationError("$", message)), null);
    }
}
