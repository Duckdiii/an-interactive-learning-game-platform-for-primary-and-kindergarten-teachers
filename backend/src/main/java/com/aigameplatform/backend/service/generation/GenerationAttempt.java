package com.aigameplatform.backend.service.generation;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.List;

/**
 * Một lần yêu cầu AI sinh nội dung. Lần đầu {@code previousOutput} là null và {@code previousErrors} rỗng; các
 * lần sau mang theo kết quả sai của lần trước cùng danh sách lỗi để AI tự sửa.
 *
 * @param attemptNumber lần thử, bắt đầu từ 1
 * @param customInstruction chỉ dẫn thêm vào system prompt (dùng khi làm lại một câu hỏi), null nếu không có
 */
public record GenerationAttempt(
        GameType gameType,
        String topic,
        Subject subject,
        GradeLevel gradeLevel,
        String structuredSchema,
        String curriculumContext,
        int attemptNumber,
        String previousOutput,
        List<ValidationError> previousErrors,
        Revision revision,
        VisualClozeImageGenerationInput imageInput,
        boolean oddImageMode,
        boolean avmCatalogMode,
        String customInstruction,
        boolean singleQuestion) {

    public GenerationAttempt(GameType gameType, String topic, Subject subject, GradeLevel gradeLevel,
            String structuredSchema, String curriculumContext, int attemptNumber, String previousOutput,
            List<ValidationError> previousErrors, Revision revision, VisualClozeImageGenerationInput imageInput,
            boolean oddImageMode, boolean avmCatalogMode) {
        this(gameType, topic, subject, gradeLevel, structuredSchema, curriculumContext, attemptNumber, previousOutput,
                previousErrors, revision, imageInput, oddImageMode, avmCatalogMode, null, false);
    }

    public GenerationAttempt(GameType gameType, String topic, Subject subject, GradeLevel gradeLevel,
            String structuredSchema, String curriculumContext, int attemptNumber, String previousOutput,
            List<ValidationError> previousErrors, VisualClozeImageGenerationInput imageInput,
            boolean oddImageMode, boolean avmCatalogMode, String customInstruction) {
        this(gameType, topic, subject, gradeLevel, structuredSchema, curriculumContext, attemptNumber, previousOutput,
                previousErrors, null, imageInput, oddImageMode, avmCatalogMode, customInstruction, customInstruction != null);
    }

    public GenerationAttempt(GameType gameType, String topic, Subject subject, GradeLevel gradeLevel,
            String structuredSchema, String curriculumContext, int attemptNumber, String previousOutput,
            List<ValidationError> previousErrors, VisualClozeImageGenerationInput imageInput,
            boolean oddImageMode, boolean avmCatalogMode) {
        this(gameType, topic, subject, gradeLevel, structuredSchema, curriculumContext,
                attemptNumber, previousOutput, previousErrors, imageInput, oddImageMode, avmCatalogMode, (String) null);
    }

    /** Lần sinh game mới (không phải sửa game đã có). */
    public GenerationAttempt(GameType gameType, String topic, Subject subject, GradeLevel gradeLevel, String structuredSchema,
            String curriculumContext, int attemptNumber, String previousOutput, List<ValidationError> previousErrors) {
        this(gameType, topic, subject, gradeLevel, structuredSchema, curriculumContext, attemptNumber, previousOutput,
                previousErrors, (Revision) null);
    }

    public GenerationAttempt(GameType gameType, String topic, Subject subject, GradeLevel gradeLevel, String structuredSchema,
            String curriculumContext, int attemptNumber, String previousOutput, List<ValidationError> previousErrors,
            Revision revision) {
        this(gameType, topic, subject, gradeLevel, structuredSchema, curriculumContext, attemptNumber, previousOutput,
                previousErrors, revision, null, false, false);
    }

    public GenerationAttempt(GameType gameType, String topic, Subject subject, GradeLevel gradeLevel,
            String structuredSchema, String curriculumContext, int attemptNumber, String previousOutput,
            List<ValidationError> previousErrors, VisualClozeImageGenerationInput imageInput, boolean oddImageMode) {
        this(gameType, topic, subject, gradeLevel, structuredSchema, curriculumContext,
                attemptNumber, previousOutput, previousErrors, null, imageInput, oddImageMode, false);
    }

    public GenerationAttempt(GameType gameType, String topic, Subject subject, GradeLevel gradeLevel,
            String structuredSchema, String curriculumContext, int attemptNumber, String previousOutput,
            List<ValidationError> previousErrors, VisualClozeImageGenerationInput imageInput) {
        this(gameType, topic, subject, gradeLevel, structuredSchema, curriculumContext,
                attemptNumber, previousOutput, previousErrors, null, imageInput, false, false);
    }

    public boolean isRetry() {
        return attemptNumber > 1;
    }
}
