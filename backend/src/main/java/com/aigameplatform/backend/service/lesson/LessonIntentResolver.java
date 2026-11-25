package com.aigameplatform.backend.service.lesson;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;

public interface LessonIntentResolver {
    Resolution resolve(Subject subject, GradeLevel gradeLevel, String idea, String lessonText);

    enum Status { READY, CLARIFICATION_REQUIRED }
    record Resolution(Status status, String preparedIdea) { }
}
