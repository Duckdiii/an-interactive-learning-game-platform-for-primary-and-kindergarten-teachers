package com.aigameplatform.backend.service.play;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.exception.RateLimitedException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class PlayStartRateLimiterTest {

    private static final class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-01-01T00:00:00Z");

        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }

    private final MutableClock clock = new MutableClock();
    private final PlayStartRateLimiter limiter = new PlayStartRateLimiter(clock);

    @Test
    void blocksTheCallerOverTheLimitButNotOthersAndRecoversAfterTheWindow() {
        for (int i = 0; i < PlayStartRateLimiter.MAX_STARTS; i++) limiter.acquire("1.1.1.1");

        assertThatThrownBy(() -> limiter.acquire("1.1.1.1")).isInstanceOf(RateLimitedException.class);
        assertThatCode(() -> limiter.acquire("2.2.2.2")).doesNotThrowAnyException();

        clock.now = clock.now.plus(PlayStartRateLimiter.WINDOW).plus(Duration.ofSeconds(1));
        assertThatCode(() -> limiter.acquire("1.1.1.1")).doesNotThrowAnyException();
    }
}
