package com.aigameplatform.backend.service.generation.cpf;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.service.generation.Revision;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.List;

/** Một lần gọi AI sinh game CPF; từ lần 2 kèm JSON lần trước và lỗi kiểm duyệt để AI sửa đúng chỗ. */
public record CpfGenerationAttempt(String idea, Subject subject, GradeLevel gradeLevel, int attemptNumber,
        String previousOutput, List<ValidationError> previousErrors, Revision revision) {

    /** Lần sinh game mới (không phải sửa game đã có). */
    public CpfGenerationAttempt(String idea, Subject subject, GradeLevel gradeLevel, int attemptNumber, String previousOutput,
            List<ValidationError> previousErrors) {
        this(idea, subject, gradeLevel, attemptNumber, previousOutput, previousErrors, null);
    }

    public boolean isRetry() {
        return previousOutput != null;
    }
}
