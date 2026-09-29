package com.aigameplatform.backend.service.validation;

import java.util.List;

/**
 * Chain of Responsibility: mỗi lớp kiểm duyệt chỉ kiểm tra phần của mình. Có lỗi thì dừng chuỗi
 * và trả lỗi; hợp lệ thì chuyển cho lớp kế tiếp. Không lớp nào được bỏ qua.
 */
public abstract class AbstractGameValidator {

    private AbstractGameValidator next;

    /** Nối lớp kế tiếp và trả về chính lớp đó để nối tiếp theo kiểu {@code a.linkWith(b).linkWith(c)}. */
    public AbstractGameValidator linkWith(AbstractGameValidator next) {
        this.next = next;
        return next;
    }

    public final List<ValidationError> validate(GameValidationContext context) {
        List<ValidationError> errors = check(context);
        if (!errors.isEmpty() || next == null) {
            return errors;
        }
        return next.validate(context);
    }

    /** @return danh sách lỗi của riêng lớp này; rỗng nếu hợp lệ. */
    protected abstract List<ValidationError> check(GameValidationContext context);
}
