package com.aigameplatform.backend.service.asset.binding;

import java.util.Locale;

/** Bộ gán hình làm gì với trường {@code asset} AI đã điền. */
public enum BindMode {

    /** Chỉ điền ô AI để trống hoặc ghi id không có trong danh mục; giữ nguyên hình AI đã chọn đúng. */
    FILL_EMPTY("fill-empty"),

    /** Bộ gán hình quyết định mọi ô, bỏ qua hình AI đã chọn. */
    OVERRIDE("override");

    private final String property;

    BindMode(String property) {
        this.property = property;
    }

    /** Giá trị trong cấu hình ({@code app.assets.binder.mode}). */
    public String property() {
        return property;
    }

    /**
     * Đọc từ cấu hình. Giá trị lạ thì báo lỗi ngay lúc khởi động thay vì lặng lẽ dùng mặc định.
     *
     * @throws IllegalArgumentException khi giá trị không phải {@code fill-empty} hay {@code override}
     */
    public static BindMode fromProperty(String value) {
        String normalized = value == null ? "" : value.strip().toLowerCase(Locale.ROOT);
        for (BindMode mode : values()) {
            if (mode.property.equals(normalized)) return mode;
        }
        throw new IllegalArgumentException("app.assets.binder.mode phải là fill-empty hoặc override, nhận được: " + value);
    }
}
