package com.aigameplatform.backend.service.validation.cpf;

import com.aigameplatform.backend.service.validation.ValidationError;
import java.util.List;
import tools.jackson.databind.JsonNode;

/** Kết quả kiểm duyệt game CPF: hợp lệ thì {@code errors} rỗng và {@code game} là JSON đã qua đủ 3 lớp. */
public record CpfValidationReport(List<ValidationError> errors, JsonNode game) {

    public boolean valid() {
        return errors.isEmpty();
    }

    /** Có nội dung không an toàn: từ chối luôn, không cho AI sinh lại. */
    public boolean unsafe() {
        return errors.stream().anyMatch(e -> e.kind() == ValidationError.Kind.UNSAFE);
    }

    /** Không kiểm tra được độ an toàn: cho thử lại sau. */
    public boolean unavailable() {
        return errors.stream().anyMatch(e -> e.kind() == ValidationError.Kind.UNAVAILABLE);
    }
}
