package com.aigameplatform.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.catchThrowableOfType;

import com.aigameplatform.backend.exception.RateLimitedException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class PasswordResetRateLimiterTest {

    /** Đồng hồ chỉnh được để đi qua cửa sổ 1 giờ mà không phải chờ. */
    private static final class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-11-21T03:00:00Z");

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    private final MutableClock clock = new MutableClock();
    private final PasswordResetRateLimiter limiter = new PasswordResetRateLimiter(clock);

    @Test
    void allowsThreeRequestsPerHourThenRejectsWithRetryAfterUntilTheOldestExpires() {
        limiter.acquire("lan@school.edu.vn");
        clock.advance(Duration.ofMinutes(10));
        limiter.acquire("lan@school.edu.vn");
        limiter.acquire("lan@school.edu.vn");

        RateLimitedException rejected = catchThrowableOfType(RateLimitedException.class,
                () -> limiter.acquire("lan@school.edu.vn"));

        assertThat(rejected).isNotNull();
        // Yêu cầu đầu tiên ở phút 0, đang ở phút 10: còn 50 phút.
        assertThat(rejected.getRetryAfterSeconds()).isEqualTo(Duration.ofMinutes(50).toSeconds());
    }

    @Test
    void allowsAgainOnceTheOldestRequestLeavesTheWindow() {
        limiter.acquire("lan@school.edu.vn");
        limiter.acquire("lan@school.edu.vn");
        limiter.acquire("lan@school.edu.vn");

        clock.advance(PasswordResetRateLimiter.WINDOW);

        assertThatCode(() -> limiter.acquire("lan@school.edu.vn")).doesNotThrowAnyException();
    }

    @Test
    void capsTrackedEmailsSoRandomEmailsCannotFillMemory() {
        for (int i = 0; i < PasswordResetRateLimiter.MAX_TRACKED_EMAILS; i++) {
            limiter.acquire("ngau-nhien-" + i + "@x.vn");
        }

        RateLimitedException rejected = catchThrowableOfType(RateLimitedException.class,
                () -> limiter.acquire("email-moi@x.vn"));
        assertThat(rejected).isNotNull();
        assertThat(rejected.getRetryAfterSeconds()).isEqualTo(PasswordResetRateLimiter.PRUNE_INTERVAL.toSeconds());
        // Email đã được theo dõi thì vẫn đếm bình thường, không bị chặn chung.
        assertThatCode(() -> limiter.acquire("ngau-nhien-0@x.vn")).doesNotThrowAnyException();
    }

    @Test
    void acceptsNewEmailsAgainOnceOldEntriesLeaveTheWindow() {
        for (int i = 0; i < PasswordResetRateLimiter.MAX_TRACKED_EMAILS; i++) {
            limiter.acquire("ngau-nhien-" + i + "@x.vn");
        }

        clock.advance(PasswordResetRateLimiter.WINDOW);

        assertThatCode(() -> limiter.acquire("email-moi@x.vn")).doesNotThrowAnyException();
    }

    @Test
    void countsEachEmailSeparately() {
        limiter.acquire("lan@school.edu.vn");
        limiter.acquire("lan@school.edu.vn");
        limiter.acquire("lan@school.edu.vn");

        assertThatCode(() -> limiter.acquire("hoa@school.edu.vn")).doesNotThrowAnyException();
    }
}
