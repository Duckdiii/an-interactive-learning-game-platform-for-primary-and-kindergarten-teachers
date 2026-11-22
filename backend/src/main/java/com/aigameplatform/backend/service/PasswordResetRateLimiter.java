package com.aigameplatform.backend.service;

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
 * Giới hạn 3 yêu cầu quên mật khẩu mỗi giờ cho mỗi email. Đếm theo email người dùng nhập, KHÔNG phụ thuộc email có
 * tồn tại hay không: nếu chỉ đếm email có tài khoản thì 429 sẽ để lộ email nào đã đăng ký. Đánh đổi đã biết: người
 * khác có thể dùng hết 3 lượt của một email (liên kết đã gửi trước đó vẫn dùng được).
 *
 * <p>Bộ nhớ có trần: endpoint công khai, nếu mỗi email ngẫu nhiên đều được nhớ thì kẻ tấn công làm đầy bộ nhớ được.
 * Dọn các email hết cửa sổ tối đa mỗi phút một lần (không quét mỗi request); dọn xong mà vẫn chạm trần thì từ chối
 * chung mọi email mới tới khi bớt tải.
 *
 * <p>shortcut: đếm trong bộ nhớ của một instance (mất khi khởi động lại, không chia sẻ giữa nhiều instance) và chưa
 * giới hạn theo IP; đủ cho một máy chủ. Khi chạy nhiều instance thì chuyển sang bảng DB hoặc Redis.
 */
@Component
public class PasswordResetRateLimiter {

    static final int MAX_REQUESTS = 3;
    static final Duration WINDOW = Duration.ofHours(1);
    static final int MAX_TRACKED_EMAILS = 10_000;
    static final Duration PRUNE_INTERVAL = Duration.ofMinutes(1);
    private static final String MESSAGE = "Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau.";

    private final Clock clock;
    private final Map<String, Deque<Instant>> requestsByEmail = new HashMap<>();
    private Instant lastPrune = Instant.MIN;

    public PasswordResetRateLimiter(Clock clock) {
        this.clock = clock;
    }

    /** Ghi nhận một yêu cầu; vượt giới hạn thì ném {@link RateLimitedException} kèm số giây phải chờ. */
    public synchronized void acquire(String normalizedEmail) {
        Instant now = clock.instant();
        Instant windowStart = now.minus(WINDOW);

        Deque<Instant> times = requestsByEmail.get(normalizedEmail);
        if (times == null) {
            if (requestsByEmail.size() >= MAX_TRACKED_EMAILS) {
                pruneIfDue(now, windowStart);
            }
            if (requestsByEmail.size() >= MAX_TRACKED_EMAILS) {
                throw new RateLimitedException(MESSAGE, PRUNE_INTERVAL.toSeconds());
            }
            times = new ArrayDeque<>();
            requestsByEmail.put(normalizedEmail, times);
        }

        while (!times.isEmpty() && !times.peekFirst().isAfter(windowStart)) {
            times.pollFirst();
        }
        if (times.size() >= MAX_REQUESTS) {
            long retryAfter = Math.max(1, Duration.between(now, times.peekFirst().plus(WINDOW)).toSeconds());
            throw new RateLimitedException(MESSAGE, retryAfter);
        }
        times.addLast(now);
    }

    private void pruneIfDue(Instant now, Instant windowStart) {
        if (now.isBefore(lastPrune.plus(PRUNE_INTERVAL))) {
            return;
        }
        lastPrune = now;
        requestsByEmail.values().removeIf(times -> times.isEmpty() || !times.peekLast().isAfter(windowStart));
    }
}
