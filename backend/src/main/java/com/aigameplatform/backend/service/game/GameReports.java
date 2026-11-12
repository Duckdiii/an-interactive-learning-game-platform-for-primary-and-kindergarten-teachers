package com.aigameplatform.backend.service.game;

import com.aigameplatform.backend.exception.AiGenerationTimeoutException;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.exception.UnsafeContentException;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.List;
import java.util.stream.Collectors;

/** Đổi kết quả kiểm duyệt nội dung giáo viên sửa (PUT) thành lỗi REST theo openapi.yaml. */
final class GameReports {

    private static final int MAX_ERRORS_IN_MESSAGE = 5;

    /** Ba trường quản lý của GameResponse (không phải nội dung game). */
    static final List<String> MANAGEMENT_FIELDS = List.of("gameId", "status", "updatedAt");

    private GameReports() {
    }

    static void throwIfRejected(boolean valid, boolean unsafe, boolean unavailable, List<ValidationError> errors) {
        if (valid) return;
        if (unsafe) throw new UnsafeContentException("Nội dung không phù hợp với trẻ em");
        if (unavailable) {
            throw new AiGenerationTimeoutException("Không kiểm tra được độ an toàn của nội dung, vui lòng thử lại sau");
        }
        throw new ApiException(ErrorCode.VALIDATION_ERROR, "Nội dung game chưa hợp lệ: " + errors.stream()
                .limit(MAX_ERRORS_IN_MESSAGE).map(ValidationError::toString).collect(Collectors.joining("; ")));
    }
}
