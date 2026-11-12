package com.aigameplatform.backend.service.asset;

import java.text.Normalizer;
import java.util.Locale;

/**
 * Chuẩn hóa chữ để so khớp từ khóa: bỏ dấu, "đ" thành "d", chữ thường, mọi ký tự khác chữ và số thành một dấu cách. Giống
 * {@code normalizeKeyword} của frontend nên từ khóa trong danh mục (đã không dấu) khớp được ở cả hai nơi.
 *
 * <p>Hệ quả của việc bỏ dấu: "đầu", "dâu", "đau" cùng thành "dau"; "trong", "trống", "trồng" cùng thành "trong". Vì thế danh
 * mục không dùng từ khóa trơ trọi cho những chữ như vậy.
 */
public final class VietnameseText {

    private VietnameseText() {
    }

    /**
     * Chuẩn hóa nhưng GIỮ DẤU: chữ thường, dạng NFC, mọi ký tự khác chữ và số thành một dấu cách. Dùng cho từ khóa ngắn cần
     * phân biệt dấu ("bàn" khác "bạn"), khi {@link #normalize} làm chúng trùng nhau.
     */
    public static String fold(String text) {
        if (text == null) return "";
        return Normalizer.normalize(text, Normalizer.Form.NFC).toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]+", " ").strip();
    }

    public static String normalize(String text) {
        if (text == null) return "";
        String stripped = Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .replace('đ', 'd').replace('Đ', 'd').toLowerCase(Locale.ROOT);
        return stripped.replaceAll("[^a-z0-9]+", " ").strip();
    }
}
