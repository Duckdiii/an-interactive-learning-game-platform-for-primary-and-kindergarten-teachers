package com.aigameplatform.backend.dto.response;

import com.aigameplatform.backend.entity.Game;
import java.time.Instant;

/** {@code GameSummary} của openapi.yaml: rút gọn, không kèm nội dung. Game CUSTOM lấy tên/môn/lớp từ metadata CPF (đã chép vào Game). */
public record GameSummaryResponse(String gameId, String title, String gameType, String subject, String gradeLevel,
        String status, String shareCode, String shareUrl, String thumbnailUrl, Instant updatedAt) {

    public static GameSummaryResponse of(Game game) {
        return new GameSummaryResponse(game.getId(), game.getTitle(), game.getGameType().name(),
                game.getSubject() == null ? null : game.getSubject().name(),
                game.getGrade() == null ? null : game.getGrade().name(),
                game.getStatus().name(), game.getShareCode(), null, null, game.getUpdatedAt());
    }
}
