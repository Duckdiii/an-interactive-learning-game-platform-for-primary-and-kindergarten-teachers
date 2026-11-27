package com.aigameplatform.backend.dto.classroom;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Hồ sơ lớp tối thiểu của UC-16: chỉ thông tin của lớp, không có thông tin cá nhân của học sinh. */
public record ClassroomRequest(
        @NotBlank(message = "Vui lòng nhập tên lớp") @Size(max = 100, message = "Tên lớp tối đa 100 ký tự") String className,
        @Size(max = 20, message = "Năm học tối đa 20 ký tự") String schoolYear,
        @Size(max = 100, message = "Tên trường tối đa 100 ký tự") String schoolName,
        @Valid ClassroomLearningProfile learningProfile) {

    public ClassroomRequest(String className, String schoolYear, String schoolName) {
        this(className, schoolYear, schoolName, null);
    }
}
