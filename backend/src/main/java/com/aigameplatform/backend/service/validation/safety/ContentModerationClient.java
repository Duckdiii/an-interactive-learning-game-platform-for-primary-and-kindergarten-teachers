package com.aigameplatform.backend.service.validation.safety;

import java.util.List;

/** Cổng tới dịch vụ kiểm duyệt nội dung bên ngoài, để mock được khi test và đổi nhà cung cấp dễ dàng. */
public interface ContentModerationClient {

    /** false khi chưa cấu hình (ví dụ thiếu API key); khi đó không được gọi {@link #moderate}. */
    boolean isConfigured();

    /**
     * @return đúng một kết quả cho mỗi đoạn văn, theo cùng thứ tự
     * @throws ModerationUnavailableException nếu không lấy được kết quả hợp lệ
     */
    List<ModerationResult> moderate(List<String> texts);
}
