package com.aigameplatform.backend.service.curriculum;

import static org.assertj.core.api.Assertions.*;
import com.aigameplatform.backend.exception.CurriculumServiceUnavailableException;
import java.time.*;
import java.util.concurrent.atomic.*;
import org.junit.jupiter.api.Test;

class CurriculumAvailabilityTest {
    @Test void failedChecksRecoverAfterTtlAndReadyChecksAreReused() throws Exception {
        var instant = new AtomicReference<>(Instant.parse("2026-10-30T00:00:00Z"));
        Clock clock = new Clock() {
            public ZoneId getZone() { return ZoneOffset.UTC; }
            public Clock withZone(ZoneId zone) { return this; }
            public Instant instant() { return instant.get(); }
        };
        var calls = new AtomicInteger();
        var fail = new AtomicBoolean(true);
        var availability = new CurriculumAvailability(clock, Duration.ofSeconds(30), dataset -> {
            calls.incrementAndGet();
            if (fail.get()) throw new IllegalStateException("secret provider details");
        });
        var dataset = CurriculumDataset.loadDefault();
        assertThatThrownBy(() -> availability.requireReady(dataset)).isInstanceOf(CurriculumServiceUnavailableException.class)
                .hasMessageNotContaining("secret");
        fail.set(false);
        assertThatThrownBy(() -> availability.requireReady(dataset)).isInstanceOf(CurriculumServiceUnavailableException.class);
        assertThat(calls).hasValue(1);
        instant.set(instant.get().plusSeconds(30));
        availability.requireReady(dataset);
        availability.requireReady(dataset);
        assertThat(calls).hasValue(2);
        fail.set(true);
        instant.set(instant.get().plusSeconds(30));
        assertThatThrownBy(() -> availability.requireReady(dataset)).isInstanceOf(CurriculumServiceUnavailableException.class);
    }
}
