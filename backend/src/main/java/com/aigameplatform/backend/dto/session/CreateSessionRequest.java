package com.aigameplatform.backend.dto.session;

import com.aigameplatform.backend.entity.enums.ChoosingStrategy;
import com.aigameplatform.backend.entity.enums.SessionType;
import jakarta.validation.constraints.Min;
import java.util.List;

public record CreateSessionRequest(
        String sessionName,
        SessionType sessionType,
        @Min(1) Integer maxParticipants,
        ChoosingStrategy groupingStrategy,
        List<TeamInput> teams,
        // Lớp học của giáo viên mà phiên diễn ra (tùy chọn); để thống kê UC-18 lọc theo lớp.
        String classroomId
) {
    public SessionType getEffectiveSessionType() {
        return sessionType != null ? sessionType : SessionType.SOLO;
    }

    public ChoosingStrategy getEffectiveGroupingStrategy() {
        return groupingStrategy != null ? groupingStrategy : ChoosingStrategy.RANDOM;
    }
}
