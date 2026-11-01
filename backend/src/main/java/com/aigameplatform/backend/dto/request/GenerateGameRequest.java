package com.aigameplatform.backend.dto.request;

import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.KindergartenAgeBand;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.service.factory.GameDslRequest;

/** Teacher's game-generation intent. Lesson-plan uploads are not represented until their SRS ingestion flow exists. */
public record GenerateGameRequest(GameType gameType, String topic, Subject subject, GradeLevel gradeLevel,
                                 KindergartenAgeBand kindergartenAgeBand) {
    public GameDslRequest toDslRequest() {
        if (gameType == null || topic == null || topic.isBlank() || topic.strip().length() > 200
                || subject == null || gradeLevel == null) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR,
                    "gameType, topic (1–200 ký tự), subject và gradeLevel là bắt buộc");
        }
        if ((gradeLevel == GradeLevel.KINDERGARTEN) != (kindergartenAgeBand != null)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR,
                    "Yêu cầu Mầm non phải chọn độ tuổi; các lớp Tiểu học không nhận ageBand");
        }
        return new GameDslRequest(topic.strip(), subject, gradeLevel, kindergartenAgeBand);
    }
}
