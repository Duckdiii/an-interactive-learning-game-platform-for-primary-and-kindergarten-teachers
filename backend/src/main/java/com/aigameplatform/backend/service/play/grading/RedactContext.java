package com.aigameplatform.backend.service.play.grading;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.session.Participant;

/** Dữ liệu chung khi giấu đáp án cho một lượt tải đề: game, salt của phiên và học sinh đang xem. */
public record RedactContext(Game game, String salt, Participant participant) {
}
