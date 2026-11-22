package com.aigameplatform.backend.dto.classroom;

import com.aigameplatform.backend.entity.Classroom;

public record ClassroomDto(String classroomId, String className, String schoolYear, String schoolName) {

    public static ClassroomDto of(Classroom classroom) {
        return new ClassroomDto(classroom.getId(), classroom.getClassName(), classroom.getSchoolYear(),
                classroom.getSchoolName());
    }
}
