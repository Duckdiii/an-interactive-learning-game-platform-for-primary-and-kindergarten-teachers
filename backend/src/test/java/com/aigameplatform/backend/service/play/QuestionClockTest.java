package com.aigameplatform.backend.service.play;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class QuestionClockTest {

    private static class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-01-01T00:00:00Z");

        void advance(Duration d) { now = now.plus(d); }

        @Override public java.time.ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(java.time.ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }

    private final MutableClock clock = new MutableClock();
    private final QuestionClock questionClock = new QuestionClock(clock);

    @Test
    void measuresFromQuestionsFetchThenFromPreviousAnswer() {
        questionClock.start("s", "p");
        clock.advance(Duration.ofSeconds(4));
        assertThat(questionClock.lap("s", "p", "q1")).contains(4_000L);
        clock.advance(Duration.ofMillis(2_500));
        assertThat(questionClock.lap("s", "p", "q2")).contains(2_500L);
    }

    @Test
    void reloadingQuestionsDoesNotRestartTheClock() {
        questionClock.start("s", "p");
        clock.advance(Duration.ofSeconds(3));
        questionClock.start("s", "p");
        assertThat(questionClock.lap("s", "p", "q1")).contains(3_000L);
    }

    @Test
    void resubmittedQuestionOrMissingStartGivesNoScore() {
        assertThat(questionClock.lap("s", "p", "q1")).isEmpty();
        questionClock.start("s", "p");
        assertThat(questionClock.lap("s", "p", "q1")).isPresent();
        assertThat(questionClock.lap("s", "p", "q1")).isEmpty();
    }

    @Test
    void elapsedDoesNotMoveTheMarkUntilAdvanced() {
        assertThat(questionClock.elapsed("s", "p")).isEmpty();
        questionClock.start("s", "p");
        clock.advance(Duration.ofSeconds(5));
        assertThat(questionClock.elapsed("s", "p")).contains(5_000L);
        assertThat(questionClock.elapsed("s", "p")).contains(5_000L);
        questionClock.advance("s", "p");
        clock.advance(Duration.ofSeconds(1));
        assertThat(questionClock.elapsed("s", "p")).contains(1_000L);
    }
}
