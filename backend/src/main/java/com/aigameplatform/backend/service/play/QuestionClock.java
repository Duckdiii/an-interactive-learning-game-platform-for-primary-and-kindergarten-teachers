package com.aigameplatform.backend.service.play;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Đo thời gian trả lời bằng đồng hồ server (không tin timeSpentMs do client gửi).
 * Mốc bắt đầu = lúc server phục vụ danh sách câu hỏi, rồi lúc server nhận câu trả lời trước đó.
 * shortcut: trạng thái nằm trong RAM của 1 instance, chạy nhiều instance thì chuyển sang Redis.
 */
@Component
public class QuestionClock {

    private final Clock clock;
    // sessionId -> (participantId -> trạng thái)
    private final Map<String, Map<String, State>> states = new ConcurrentHashMap<>();

    public QuestionClock(Clock clock) {
        this.clock = clock;
    }

    /** Gọi khi học sinh tải câu hỏi: chỉ đặt mốc lần đầu để tải lại trang không làm lại đồng hồ. */
    public void start(String sessionId, String participantId) {
        state(sessionId, participantId).startIfAbsent(clock.instant());
    }

    /**
     * Ghi nhận một câu trả lời. Trả về số ms server đo được, hoặc rỗng nếu câu này đã được tính điểm
     * rồi (gửi lại) hoặc chưa từng có mốc bắt đầu, khi đó không được cộng điểm.
     */
    public Optional<Long> lap(String sessionId, String participantId, String questionId) {
        return state(sessionId, participantId).lap(questionId, clock.instant());
    }

    public void clearSession(String sessionId) {
        if (sessionId != null) states.remove(sessionId);
    }

    private State state(String sessionId, String participantId) {
        return states.computeIfAbsent(sessionId, k -> new ConcurrentHashMap<>())
                .computeIfAbsent(participantId, k -> new State());
    }

    private static final class State {
        private Instant mark;
        private final Set<String> answered = new HashSet<>();

        synchronized void startIfAbsent(Instant now) {
            if (mark == null) mark = now;
        }

        synchronized Optional<Long> lap(String questionId, Instant now) {
            if (mark == null || !answered.add(questionId)) return Optional.empty();
            long elapsed = Math.max(0, Duration.between(mark, now).toMillis());
            mark = now;
            return Optional.of(elapsed);
        }
    }
}
