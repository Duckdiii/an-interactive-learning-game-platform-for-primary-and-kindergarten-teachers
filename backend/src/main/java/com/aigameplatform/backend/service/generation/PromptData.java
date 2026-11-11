package com.aigameplatform.backend.service.generation;

/** Đưa chữ do người dùng nhập vào prompt dưới dạng dữ liệu, dùng chung cho mọi prompt gửi AI. */
public final class PromptData {

    private PromptData() {
    }

    /**
     * Không cho dữ liệu tự đóng/mở vùng {@code <<< >>>} để giả làm chỉ dẫn. Đây là giảm thiểu, không phải biên giới an
     * toàn: đầu ra vẫn bị ép schema và được kiểm duyệt ở bước sau.
     */
    public static String asData(String text) {
        return text == null ? "" : text.replace("<<<", "‹‹‹").replace(">>>", "›››");
    }
}
