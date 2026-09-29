package com.aigameplatform.backend.service.validation.ai;

import com.aigameplatform.backend.dto.dsl.ai.AiGameOutput;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.List;

/** Kết quả kiểm tra JSON do AI trả về: khi hợp lệ thì {@code errors} rỗng và {@code output} đã được đọc thành record. */
public record AiOutputReport(List<ValidationError> errors, AiGameOutput output) {

    public boolean valid() {
        return errors.isEmpty();
    }
}
