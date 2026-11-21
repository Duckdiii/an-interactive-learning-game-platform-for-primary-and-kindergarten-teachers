package com.aigameplatform.backend.service.game;

import com.aigameplatform.backend.exception.RateLimitedException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Giới hạn gọi AI theo giáo viên: tối đa {@link #LIMIT} lượt trong cửa sổ trượt {@link #WINDOW} (openapi: 10 yêu cầu mỗi phút
 * cho revise) và chỉ MỘT lượt chạy cùng lúc (mỗi lượt có thể gọi AI vài lần khi thử lại), để một tài khoản không đốt hết hạn
 * mức Gemini của cả hệ thống hay giữ nhiều luồng chờ AI.
 * shortcut: đếm trong bộ nhớ của một tiến trình; chạy nhiều bản backend thì chuyển sang kho dùng chung (Redis, bảng DB).
 */
@Component
public class AiRequestRateLimiter {

    static final int LIMIT = 10;
    static final Duration WINDOW = Duration.ofMinutes(1);
    /** Giây gợi ý chờ khi giáo viên đã có một lượt đang chạy. */
    static final long BUSY_RETRY_SECONDS = 5;

    private final Clock clock;
    private final Map<String, Deque<Instant>> calls = new ConcurrentHashMap<>();
    private final Set<String> running = ConcurrentHashMap.newKeySet();

    public AiRequestRateLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Bắt đầu một lượt của {@code key}; vượt giới hạn hoặc đang có lượt chạy thì ném 429. Gọi {@link Permit#close()} khi xong. */
    public Permit acquire(String key) {
        if (!running.add(key)) {
            throw new RateLimitedException("Trợ lý đang sửa yêu cầu trước của cô, vui lòng đợi xong rồi nhắn tiếp", BUSY_RETRY_SECONDS);
        }
        try {
            record(key);
        } catch (RuntimeException e) {
            running.remove(key);
            throw e;
        }
        return () -> running.remove(key);
    }

    private void record(String key) {
        Instant now = clock.instant();
        calls.compute(key, (k, recent) -> {
            Deque<Instant> window = recent == null ? new ArrayDeque<>() : recent;
            while (!window.isEmpty() && !window.peekFirst().isAfter(now.minus(WINDOW))) window.pollFirst();
            if (window.size() >= LIMIT) {
                long wait = Math.max(1, Duration.between(now, window.peekFirst().plus(WINDOW)).toSeconds() + 1);
                throw new RateLimitedException("Cô đã gửi nhiều yêu cầu sửa liên tiếp, vui lòng thử lại sau " + wait + " giây", wait);
            }
            window.addLast(now);
            return window;
        });
    }

    /** Lượt đang chạy; đóng để giáo viên gửi lượt kế. */
    public interface Permit extends AutoCloseable {
        @Override
        void close();
    }
}
