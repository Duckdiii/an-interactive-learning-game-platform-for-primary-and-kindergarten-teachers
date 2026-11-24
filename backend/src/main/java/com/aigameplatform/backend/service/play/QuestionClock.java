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
    private final Map<String, SessionClock> states = new ConcurrentHashMap<>();

    public QuestionClock(Clock clock) {
        this.clock = clock;
    }

    /** Gọi khi học sinh tải câu hỏi: chỉ đặt mốc lần đầu để tải lại trang không làm lại đồng hồ. */
    public void start(String sessionId, String participantId) {
        SessionClock session = session(sessionId);
        session.participant(participantId).startIfAbsent(session.activeTime(clock));
    }

    /**
     * Ghi nhận một câu trả lời. Trả về số ms server đo được, hoặc rỗng nếu câu này đã được tính điểm
     * rồi (gửi lại) hoặc chưa từng có mốc bắt đầu, khi đó không được cộng điểm.
     */
    public Optional<Long> lap(String sessionId, String participantId, String questionId) {
        SessionClock session = session(sessionId);
        return session.participant(participantId).lap(questionId, session.activeTime(clock));
    }

    /**
     * Số ms server đo từ mốc hiện tại tới giờ, không dời mốc. Rỗng nếu chưa có mốc (chưa tải đề, hoặc server vừa khởi
     * động lại): khi đó chỉ còn số client khai. Dời mốc ({@link #advance}) chỉ sau khi một câu được nhận hợp lệ, để
     * gửi một yêu cầu sai không "đặt lại đồng hồ" cho lần nộp thật.
     */
    public Optional<Long> elapsed(String sessionId, String participantId) {
        SessionClock session = session(sessionId);
        return session.participant(participantId).elapsed(session.activeTime(clock));
    }

    public void advance(String sessionId, String participantId) {
        SessionClock session = session(sessionId);
        session.participant(participantId).advance(session.activeTime(clock));
    }

    public void pauseSession(String sessionId) {
        session(sessionId).pause(clock);
    }

    public void resumeSession(String sessionId) {
        session(sessionId).resume(clock);
    }

    public void clearSession(String sessionId) {
        if (sessionId != null) states.remove(sessionId);
    }

    private SessionClock session(String sessionId) {
        return states.computeIfAbsent(sessionId, k -> new SessionClock());
    }

    private static final class SessionClock {
        private final Map<String, State> participants = new ConcurrentHashMap<>();
        private Instant pausedAt;
        private Duration pausedTime = Duration.ZERO;

        State participant(String participantId) {
            return participants.computeIfAbsent(participantId, k -> new State());
        }

        synchronized Instant activeTime(Clock clock) {
            return (pausedAt == null ? clock.instant() : pausedAt).minus(pausedTime);
        }

        synchronized void pause(Clock clock) {
            if (pausedAt == null) pausedAt = clock.instant();
        }

        synchronized void resume(Clock clock) {
            if (pausedAt == null) return;
            pausedTime = pausedTime.plus(Duration.between(pausedAt, clock.instant()));
            pausedAt = null;
        }
    }

    private static final class State {
        private Instant mark;
        private final Set<String> answered = new HashSet<>();

        synchronized void startIfAbsent(Instant now) {
            if (mark == null) mark = now;
        }

        synchronized Optional<Long> elapsed(Instant now) {
            return mark == null ? Optional.empty() : Optional.of(Math.max(0, Duration.between(mark, now).toMillis()));
        }

        synchronized void advance(Instant now) {
            if (mark != null) mark = now;
        }

        synchronized Optional<Long> lap(String questionId, Instant now) {
            if (mark == null || !answered.add(questionId)) return Optional.empty();
            long elapsed = Math.max(0, Duration.between(mark, now).toMillis());
            mark = now;
            return Optional.of(elapsed);
        }
    }
}
