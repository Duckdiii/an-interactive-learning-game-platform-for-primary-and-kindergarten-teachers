package com.aigameplatform.backend.service.validation;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import java.util.List;

/** Kết quả kiểm duyệt: khi hợp lệ thì {@code errors} rỗng và {@code game} là game đã đọc thành record. */
public record ValidationReport(List<ValidationError> errors, GameDsl game) {

    public boolean valid() {
        return errors.isEmpty();
    }

    /** Có nội dung không an toàn: phải từ chối luôn, không cho AI sinh lại. */
    public boolean unsafe() {
        return errors.stream().anyMatch(e -> e.kind() == ValidationError.Kind.UNSAFE);
    }

    /** Không kiểm tra được độ an toàn (dịch vụ ngoài lỗi): coi như chưa an toàn, cho phép thử lại sau. */
    public boolean unavailable() {
        return errors.stream().anyMatch(e -> e.kind() == ValidationError.Kind.UNAVAILABLE);
    }
}
