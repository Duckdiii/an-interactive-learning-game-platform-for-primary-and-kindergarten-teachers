package com.aigameplatform.backend.service.play.grading;

import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.service.play.support.OpaqueIds;
import java.util.Locale;
import tools.jackson.databind.JsonNode;

/** Hàm nhỏ dùng chung để đọc đầu vào của học sinh và dựng lỗi; không giữ trạng thái. */
public final class PlayInputs {

    // Chữ trẻ gõ được lưu vào `answer_json`; chặn chuỗi quá dài do người gọi API cố tình gửi.
    public static final int MAX_TYPED_ANSWER_LENGTH = 100;

    private PlayInputs() {
    }

    public static String normalize(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    public static String text(JsonNode node, String key) {
        return node != null && node.has(key) && node.get(key).isString() ? node.get(key).asString() : null;
    }

    public static int integer(JsonNode node, String key, int fallback) {
        return node != null && node.has(key) && node.get(key).canConvertToInt() ? node.get(key).intValue() : fallback;
    }

    public static ApiException validation(String message) {
        return new ApiException(ErrorCode.VALIDATION_ERROR, message);
    }

    public static ApiException notFound() {
        return new ApiException(ErrorCode.NOT_FOUND, "Resource not found");
    }

    public static String opaque(String salt, int index, String value) {
        return OpaqueIds.opaque(salt, index, value);
    }

    /** Khóa xáo thứ tự xác định theo phiên và câu, để tải lại vẫn ra cùng thứ tự mà không cần lưu ánh xạ. */
    public static String orderingKey(String salt, int index, String value) {
        return OpaqueIds.hmac(salt, index + "|order|" + value);
    }
}
