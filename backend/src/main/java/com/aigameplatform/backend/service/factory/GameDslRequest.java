package com.aigameplatform.backend.service.factory;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;

/** Thông tin giáo viên yêu cầu, dùng để dựng phần vỏ của game (AI không lặp lại các thông tin này). */
public record GameDslRequest(String topic, Subject subject, GradeLevel gradeLevel) {

    public GameDslRequest {
        if (topic == null || topic.isBlank()) {
            throw new IllegalArgumentException("Chủ đề không được để trống");
        }
        if (subject == null || gradeLevel == null) {
            throw new IllegalArgumentException("Môn học và khối lớp là bắt buộc");
        }
    }
}
