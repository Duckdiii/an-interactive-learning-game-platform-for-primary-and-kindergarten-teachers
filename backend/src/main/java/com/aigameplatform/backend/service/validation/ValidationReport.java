package com.aigameplatform.backend.service.validation;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import java.util.List;

/** Kết quả kiểm duyệt: khi hợp lệ thì {@code errors} rỗng và {@code game} là game đã đọc thành record. */
public record ValidationReport(List<ValidationError> errors, GameDsl game) {

    public boolean valid() {
        return errors.isEmpty();
    }
}
