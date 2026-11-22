package com.aigameplatform.backend.service.game;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.exception.RateLimitedException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class AiRequestRateLimiterTest {

    /** Đồng hồ chỉnh tay được để thử cửa sổ trượt. */
    private static final class ManualClock extends Clock {
        private Instant now = Instant.parse("2026-11-12T00:00:00Z");

        void advance(Duration d) {
            now = now.plus(d);
        }

        @Override
        public Instant instant() {
            return now;
        }

        @Override
        public java.time.ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(java.time.ZoneId zone) {
            return this;
        }
    }

    private final ManualClock clock = new ManualClock();
    private final AiRequestRateLimiter limiter = new AiRequestRateLimiter(clock);

    @Test
    void tenCallsPassTheEleventhWaitsUntilTheOldestLeavesTheWindow() {
        for (int i = 0; i < AiRequestRateLimiter.LIMIT; i++) {
            limiter.acquire("t1").close();
            clock.advance(Duration.ofSeconds(1));
        }
        assertThatThrownBy(() -> limiter.acquire("t1")).isInstanceOfSatisfying(RateLimitedException.class,
                e -> assertThat(e.getRetryAfterSeconds()).isBetween(1L, 60L));

        clock.advance(Duration.ofSeconds(51));
        limiter.acquire("t1").close();
    }

    @Test
    void eachTeacherHasTheirOwnBudget() {
        for (int i = 0; i < AiRequestRateLimiter.LIMIT; i++) limiter.acquire("t1").close();
        limiter.acquire("t2").close();
        assertThatThrownBy(() -> limiter.acquire("t1")).isInstanceOf(RateLimitedException.class);
    }

    @Test
    void onlyOneRunningRevisionPerTeacherAndTheSlotFreesWhenDone() {
        AiRequestRateLimiter.Permit first = limiter.acquire("t1");
        assertThatThrownBy(() -> limiter.acquire("t1")).isInstanceOfSatisfying(RateLimitedException.class,
                e -> assertThat(e.getRetryAfterSeconds()).isEqualTo(AiRequestRateLimiter.BUSY_RETRY_SECONDS));
        limiter.acquire("t2").close();

        first.close();
        limiter.acquire("t1").close();
    }

    @Test
    void aRejectedCallDoesNotLeaveTheTeacherMarkedAsRunning() {
        for (int i = 0; i < AiRequestRateLimiter.LIMIT; i++) limiter.acquire("t1").close();
        assertThatThrownBy(() -> limiter.acquire("t1")).isInstanceOf(RateLimitedException.class);

        clock.advance(AiRequestRateLimiter.WINDOW);
        limiter.acquire("t1").close();
    }
}
