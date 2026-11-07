package com.aigameplatform.backend.service.generation.cpf;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.AiGenerationTimeoutException;
import com.aigameplatform.backend.exception.UnsafeContentException;
import com.aigameplatform.backend.service.generation.AiServiceUnavailableException;
import com.aigameplatform.backend.service.validation.ValidationError;
import com.aigameplatform.backend.service.validation.cpf.CpfValidationReport;
import com.aigameplatform.backend.service.validation.cpf.CpfValidationService;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Sinh game CPF bằng AI rồi qua đủ 3 lớp kiểm duyệt (docs/cpf-game-v2.0.0.md mục 4.4): Lớp 1-2 lỗi thì gọi lại AI kèm lỗi
 * có vị trí, tối đa {@code app.generation.max-retries} lần; vẫn lỗi thì 504; Lớp 3 không an toàn thì từ chối ngay, không sinh lại.
 */
@Slf4j
@Service
public class CpfGenerationService {

    private static final int MAX_FEEDBACK_ERRORS = 10;

    private final ObjectProvider<CpfContentGenerator> generatorProvider;
    private final CpfValidationService validation;
    private final JsonMapper jsonMapper;
    private final int maxRetries;

    // ObjectProvider để ứng dụng vẫn khởi động khi chưa bật Gemini; thiếu thì báo lúc gọi.
    public CpfGenerationService(ObjectProvider<CpfContentGenerator> generatorProvider, CpfValidationService validation,
            JsonMapper jsonMapper, @Value("${app.generation.max-retries:2}") int maxRetries) {
        if (maxRetries < 0) throw new IllegalArgumentException("app.generation.max-retries không được âm");
        this.generatorProvider = generatorProvider;
        this.validation = validation;
        this.jsonMapper = jsonMapper;
        this.maxRetries = maxRetries;
    }

    /** @return game CPF dạng hoàn chỉnh đã qua cả 3 lớp kiểm duyệt */
    public JsonNode generate(String idea, Subject subject, GradeLevel gradeLevel) {
        CpfContentGenerator generator = generatorProvider.getIfAvailable();
        if (generator == null) throw new AiGenerationTimeoutException("Chưa cấu hình dịch vụ AI để sinh game");

        String previousOutput = null;
        List<ValidationError> previousErrors = List.of();
        for (int attempt = 1; attempt <= maxRetries + 1; attempt++) {
            String raw = callAi(generator, new CpfGenerationAttempt(idea, subject, gradeLevel, attempt, previousOutput, previousErrors));
            CpfValidationReport report = validate(raw, subject, gradeLevel);
            if (report.valid()) return report.game();
            if (report.unsafe()) {
                log.warn("Game CPF bị Lớp 3 từ chối (lần thử {})", attempt);
                throw new UnsafeContentException("Nội dung không phù hợp với trẻ em");
            }
            if (report.unavailable()) {
                throw new AiGenerationTimeoutException("Không kiểm tra được độ an toàn của nội dung, vui lòng thử lại sau");
            }
            previousOutput = raw;
            previousErrors = report.errors().stream().limit(MAX_FEEDBACK_ERRORS).toList();
            // Chỉ ghi đường dẫn lỗi: thông báo của validator có thể chứa giá trị (chữ AI sinh từ ý tưởng giáo viên).
            log.info("Lần thử {} sinh game CPF chưa hợp lệ: {} lỗi, tại {}", attempt, report.errors().size(),
                    previousErrors.stream().map(ValidationError::path).toList());
        }
        throw new AiGenerationTimeoutException("AI chưa sinh được game hợp lệ sau " + (maxRetries + 1) + " lần thử");
    }

    private static String callAi(CpfContentGenerator generator, CpfGenerationAttempt attempt) {
        try {
            return generator.generate(attempt);
        } catch (AiServiceUnavailableException e) {
            log.error("Không gọi được dịch vụ AI ({})", e.getClass().getSimpleName());
            throw new AiGenerationTimeoutException("Dịch vụ AI không phản hồi, vui lòng thử lại sau", e);
        }
    }

    private CpfValidationReport validate(String raw, Subject subject, GradeLevel gradeLevel) {
        JsonNode json;
        try {
            json = raw == null || raw.isBlank() ? null : jsonMapper.readTree(raw);
        } catch (JacksonException e) {
            return validation.validate(raw);
        }
        if (json instanceof ObjectNode game) {
            normalize(game, subject, gradeLevel);
        }
        return json == null ? validation.validate(raw) : validation.validate(json);
    }

    /**
     * Môn và khối lớp lấy theo yêu cầu của giáo viên, không tin AI. Decoder có thể trả null cho trường tùy chọn; bỏ đi để
     * schema chặt xét như trường vắng mặt.
     */
    private static void normalize(ObjectNode game, Subject subject, GradeLevel gradeLevel) {
        removeNulls(game);
        if (game.path("metadata") instanceof ObjectNode metadata) {
            metadata.put("subject", subject.name());
            metadata.put("gradeLevel", gradeLevel.name());
        }
        for (JsonNode rule : game.path("rules")) {
            // ROUND_START không có vật được tương tác nên không có $subject để đặt EFFECT vào (docs mục 4, Lớp 2).
            boolean hasSubject = !"ROUND_START".equals(rule.path("on").path("type").asString(""));
            for (JsonNode action : rule.path("do")) {
                keepFieldsOfType(action, hasSubject);
                action.path("onCorrect").forEach(child -> keepFieldsOfType(child, hasSubject));
                action.path("onWrong").forEach(child -> keepFieldsOfType(child, hasSubject));
            }
        }
    }

    /** Trường mà mỗi loại hành động được có; test CpfGenerationServiceTest đối chiếu với các nhánh oneOf của cpf-game.schema.json. */
    static final Map<String, Set<String>> ACTION_FIELDS = Map.of(
            "CHECK", Set.of("type", "onCorrect", "onWrong"),
            "MOVE_TO", Set.of("type", "subject", "to"),
            "ADVANCE", Set.of("type", "subject"),
            "REMOVE", Set.of("type", "subject"),
            "EFFECT", Set.of("type", "name", "at"),
            "SOUND", Set.of("type", "name"),
            "SCORE", Set.of("type", "add"));

    /**
     * Decoder là một object phẳng chứa trường của mọi loại hành động, nên Gemini hay điền thừa (ví dụ {@code add} cho
     * EFFECT) và hay bỏ {@code at} của EFFECT, tự sửa không được qua phản hồi lỗi (chạy thật: sai cả 3 lần thử). Bỏ trường
     * không thuộc loại; EFFECT thiếu {@code at} thì đặt ở vật vừa tương tác ({@code $subject}). Trường thiếu khác để schema báo.
     */
    private static void keepFieldsOfType(JsonNode node, boolean hasSubject) {
        if (!(node instanceof ObjectNode action)) return;
        String type = action.path("type").asString("");
        Set<String> allowed = ACTION_FIELDS.get(type);
        if (allowed == null) return;
        action.remove(action.propertyNames().stream().filter(name -> !allowed.contains(name)).toList());
        if ("EFFECT".equals(type) && hasSubject && !action.has("at")) action.put("at", "$subject");
    }

    private static void removeNulls(JsonNode node) {
        if (node instanceof ObjectNode object) {
            List<String> nullFields = object.properties().stream()
                    .filter(e -> e.getValue().isNull()).map(java.util.Map.Entry::getKey).toList();
            object.remove(nullFields);
            object.forEach(CpfGenerationService::removeNulls);
        } else if (node instanceof ArrayNode array) {
            array.forEach(CpfGenerationService::removeNulls);
        }
    }
}
