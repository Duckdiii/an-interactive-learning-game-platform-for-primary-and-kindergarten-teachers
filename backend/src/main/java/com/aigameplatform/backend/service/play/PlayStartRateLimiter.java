package com.aigameplatform.backend.service.play;

import com.aigameplatform.backend.exception.RateLimitedException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Giới hạn số lần vào chơi tự do ({@code POST /games/shared/{code}/play}, công khai, mỗi lần tạo một phiên) theo địa chỉ
 * gọi. Ngưỡng đủ rộng cho một lớp dùng chung một IP của trường; chỉ chặn việc bắn hàng loạt để làm đầy bảng phiên.
 *
 * <p>shortcut: đếm trong RAM của một instance, theo địa chỉ TCP (sau reverse proxy thì mọi người cùng một địa chỉ nên
 * cần cấu hình forward-headers), bộ nhớ có trần. Chạy nhiều instance thì chuyển sang Redis hoặc bảng DB.
 */
@Component
public class PlayStartRateLimiter {

    static final int MAX_STARTS = 120;
    static final Duration WINDOW = Duration.ofMinutes(10);
    static final int MAX_TRACKED = 10_000;
    private static final String MESSAGE = "Bạn vào chơi quá nhiều lần. Vui lòng thử lại sau.";

    private final Clock clock;
    private final Map<String, Deque<Instant>> startsByCaller = new HashMap<>();

    public PlayStartRateLimiter(Clock clock) {
        this.clock = clock;
    }

    public synchronized void acquire(String caller) {
        Instant now = clock.instant();
        Instant windowStart = now.minus(WINDOW);
        if (!startsByCaller.containsKey(caller) && startsByCaller.size() >= MAX_TRACKED) {
            startsByCaller.values().removeIf(times -> times.isEmpty() || !times.peekLast().isAfter(windowStart));
            if (startsByCaller.size() >= MAX_TRACKED) throw new RateLimitedException(MESSAGE, 60);
        }
        Deque<Instant> times = startsByCaller.computeIfAbsent(caller, key -> new ArrayDeque<>());
        while (!times.isEmpty() && !times.peekFirst().isAfter(windowStart)) times.pollFirst();
        if (times.size() >= MAX_STARTS) {
            throw new RateLimitedException(MESSAGE,
                    Math.max(1, Duration.between(now, times.peekFirst().plus(WINDOW)).toSeconds()));
        }
        times.addLast(now);
    }
}
