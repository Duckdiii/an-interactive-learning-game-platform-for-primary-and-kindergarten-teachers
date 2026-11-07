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
            log.info("Lần thử {} sinh game CPF chưa hợp lệ: {} lỗi", attempt, report.errors().size());
            previousOutput = raw;
            previousErrors = report.errors().stream().limit(MAX_FEEDBACK_ERRORS).toList();
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
