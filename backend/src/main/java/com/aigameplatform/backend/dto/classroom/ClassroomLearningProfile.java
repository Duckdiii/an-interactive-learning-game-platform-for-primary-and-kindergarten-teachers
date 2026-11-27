package com.aigameplatform.backend.dto.classroom;

import com.aigameplatform.backend.entity.Classroom;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record ClassroomLearningProfile(GradeLevel gradeLevel,
        @Min(value = 1, message = "Sĩ số phải từ 1 đến 200")
        @Max(value = 200, message = "Sĩ số phải từ 1 đến 200") Integer studentCount,
        @Size(max = 250, message = "Phạm vi kiến thức tối đa 250 ký tự") String knowledgeScope,
        @Size(max = 250, message = "Đặc điểm lớp tối đa 250 ký tự") String characteristics,
        @Size(max = 250, message = "Chủ đề yêu thích tối đa 250 ký tự") String favoriteTopics) {

    public static ClassroomLearningProfile of(Classroom classroom) {
        return new ClassroomLearningProfile(classroom.getGradeLevel(), classroom.getStudentCount(),
                classroom.getKnowledgeScope(), classroom.getCharacteristics(), classroom.getFavoriteTopics());
    }
}
