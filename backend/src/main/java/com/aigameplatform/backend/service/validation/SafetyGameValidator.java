package com.aigameplatform.backend.service.validation;

import com.aigameplatform.backend.service.validation.safety.GameTextExtractor;
import java.util.List;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Layer 3 (an toàn): nội dung dành cho trẻ 5-11 tuổi phải sạch. Đối chiếu danh sách từ cấm trước (nhanh, không
 * tốn tiền), nếu sạch mới gửi một lần lên OpenAI Moderation. Lỗi ở lớp này là UNSAFE hoặc UNAVAILABLE chứ không
 * phải INVALID: không cho AI sinh lại mà từ chối hoặc báo thử lại.
 */
@Component
@Order(4)
public class SafetyGameValidator extends AbstractGameValidator {

    private final ContentSafetyCheck safetyCheck;

    public SafetyGameValidator(ContentSafetyCheck safetyCheck) {
        this.safetyCheck = safetyCheck;
    }

    @Override
    protected List<ValidationError> check(GameValidationContext context) {
        return safetyCheck.check(GameTextExtractor.extract(context.getJson()));
    }
}
