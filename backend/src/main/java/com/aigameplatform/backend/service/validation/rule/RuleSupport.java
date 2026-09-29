package com.aigameplatform.backend.service.validation.rule;

import com.aigameplatform.backend.dto.dsl.PairSideDsl;
import com.aigameplatform.backend.service.validation.ValidationError;
import java.text.Normalizer;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.function.IntFunction;

/** Các hàm dùng chung cho luật Layer 2. */
final class RuleSupport {

    private RuleSupport() {
    }

    /** Chuẩn hóa để so sánh: NFC, bỏ khoảng trắng thừa, không phân biệt hoa thường. Giữ nguyên dấu tiếng Việt. */
    static String normalize(String text) {
        if (text == null) {
            return "";
        }
        String nfc = Normalizer.normalize(text, Normalizer.Form.NFC);
        return nfc.strip().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    /** Id theo vị trí: 0 -> "a", 1 -> "b"... */
    static String positionalId(int index) {
        return String.valueOf((char) ('a' + index));
    }

    /** Khóa nhận diện một phía của cặp: chữ nếu có, không thì từ khóa hình. */
    static String sideKey(PairSideDsl side) {
        if (side == null) {
            return "";
        }
        if (side.text() != null && !side.text().isBlank()) {
            return "text:" + normalize(side.text());
        }
        return "prompt:" + normalize(side.visualPrompt());
    }

    /** Báo lỗi cho mỗi phần tử có khóa trùng với một phần tử đứng trước nó. */
    static <T> void checkUnique(
            List<T> items, Function<T, String> key, String listPath, String field, List<ValidationError> errors) {
        checkUnique(items, key, i -> elementPath(listPath, i, field), errors);
    }

    /** Như trên nhưng vị trí của từng phần tử do {@code pathOf} quyết định (dùng khi danh sách được gộp từ nhiều nơi). */
    static <T> void checkUnique(
            List<T> items, Function<T, String> key, IntFunction<String> pathOf, List<ValidationError> errors) {
        Map<String, Integer> firstSeen = new HashMap<>();
        for (int i = 0; i < items.size(); i++) {
            String k = key.apply(items.get(i));
            Integer first = firstSeen.putIfAbsent(k, i);
            if (first != null) {
                errors.add(new ValidationError(pathOf.apply(i),
                        "Giá trị \"" + k + "\" bị trùng với " + pathOf.apply(first) + "; các phần tử không được trùng nhau"));
            }
        }
    }

    /** Id của phần tử thứ i phải là a, b, c... đúng theo vị trí. */
    static <T> void checkPositionalIds(
            List<T> items, Function<T, String> id, String listPath, List<ValidationError> errors) {
        for (int i = 0; i < items.size(); i++) {
            String expected = positionalId(i);
            String actual = id.apply(items.get(i));
            if (!expected.equals(actual)) {
                errors.add(new ValidationError(elementPath(listPath, i, "id"),
                        "id phải là \"" + expected + "\" theo vị trí (đang là \"" + actual + "\")"));
            }
        }
    }

    static String elementPath(String listPath, int index, String field) {
        String element = listPath + "[" + index + "]";
        return field == null || field.isEmpty() ? element : element + "." + field;
    }
}
