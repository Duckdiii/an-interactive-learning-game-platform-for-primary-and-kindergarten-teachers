package com.aigameplatform.backend.service.asset.binding;

/**
 * Một ô cần hình trong JSON đầu ra của AI (một nút có {@code visualPrompt}).
 *
 * @param path đường dẫn JSON của nút (ví dụ {@code /questions/0}), để ghi quyết định và ghi lại {@code asset}
 * @param visualPrompt mô tả hình AI viết; nguồn truy vấn chính
 * @param siblingText chữ của chính nút (text, correctWord...) chỉ dùng khi visualPrompt trống; không gồm đáp án nhiễu
 * @param currentAsset id hình AI đã điền, hoặc null
 */
public record CellContext(String path, String visualPrompt, String siblingText, String currentAsset) {

    /** Chữ đem đi tìm hình: visualPrompt, trống thì lấy chữ của nút; không bao giờ null. */
    public String query() {
        if (visualPrompt != null && !visualPrompt.isBlank()) return visualPrompt.strip();
        return siblingText == null ? "" : siblingText.strip();
    }

    /** Truy vấn lấy từ chữ của nút thay vì visualPrompt (để ghi đường đi của quyết định). */
    public boolean usesSiblingText() {
        return (visualPrompt == null || visualPrompt.isBlank()) && siblingText != null && !siblingText.isBlank();
    }
}
