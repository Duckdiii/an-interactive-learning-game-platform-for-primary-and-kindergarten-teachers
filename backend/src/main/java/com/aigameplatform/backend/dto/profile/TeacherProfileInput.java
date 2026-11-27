package com.aigameplatform.backend.dto.profile;

import com.aigameplatform.backend.dto.media.SpeechVoice;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import jakarta.validation.constraints.Size;

public record TeacherProfileInput(
        @Size(max = 255, message = "Tên trường tối đa 255 ký tự") String school,
        @Size(max = 100, message = "Tên bộ sách tối đa 100 ký tự") String textbook,
        SpeechVoice voice, Subject subject, GradeLevel gradeLevel) { }
