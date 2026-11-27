package com.aigameplatform.backend.service.factory;

import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.enums.KindergartenAgeBand;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.dto.request.GenerateGameRequest;
import java.util.List;

/** Thông tin giáo viên yêu cầu, dùng để dựng phần vỏ của game (AI không lặp lại các thông tin này). */
public record GameDslRequest(String topic, Subject subject, GradeLevel gradeLevel,
                             KindergartenAgeBand kindergartenAgeBand, String curriculumDomain,
                             VisualClozeMode visualClozeMode, String sceneImageUrl,
                             List<GenerateGameRequest.OptionImage> optionImages) {

    public GameDslRequest(String topic, Subject subject, GradeLevel gradeLevel,
            KindergartenAgeBand kindergartenAgeBand, String curriculumDomain, VisualClozeMode visualClozeMode,
            String sceneImageUrl) {
        this(topic, subject, gradeLevel, kindergartenAgeBand, curriculumDomain, visualClozeMode, sceneImageUrl, null);
    }

    public GameDslRequest(String topic, Subject subject, GradeLevel gradeLevel,
            KindergartenAgeBand kindergartenAgeBand, String curriculumDomain) {
        this(topic, subject, gradeLevel, kindergartenAgeBand, curriculumDomain, null, null, null);
    }

    public GameDslRequest(String topic, Subject subject, GradeLevel gradeLevel) {
        this(topic, subject, gradeLevel, null, null, null, null, null);
    }

    public GameDslRequest(String topic, Subject subject, GradeLevel gradeLevel,
                          KindergartenAgeBand kindergartenAgeBand) {
        this(topic, subject, gradeLevel, kindergartenAgeBand, null, null, null, null);
    }

    public VisualClozeMode effectiveVisualClozeMode() {
        return visualClozeMode == null ? VisualClozeMode.TEXT : visualClozeMode;
    }

    public GameDslRequest {
        optionImages = optionImages == null ? null : List.copyOf(optionImages);
        if (topic == null || topic.isBlank()) {
            throw new IllegalArgumentException("Chủ đề không được để trống");
        }
        if (subject == null || gradeLevel == null) {
            throw new IllegalArgumentException("Môn học và khối lớp là bắt buộc");
        }
        if (gradeLevel != GradeLevel.KINDERGARTEN && kindergartenAgeBand != null) {
            throw new IllegalArgumentException("Age band may only be supplied for kindergarten");
        }
    }
}
