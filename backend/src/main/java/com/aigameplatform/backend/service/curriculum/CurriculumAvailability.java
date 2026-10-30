package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.exception.CurriculumServiceUnavailableException;
import java.time.*;
import java.util.Objects;

/** A bounded readiness cache; query failures are still checked on every request. */
public final class CurriculumAvailability {
    @FunctionalInterface public interface Check { void run(CurriculumDataset dataset) throws Exception; }
    private final Clock clock;
    private final Duration ttl;
    private final Check check;
    private Instant expires = Instant.MIN;
    private CurriculumSource checkedSource;
    private boolean ready;

    public CurriculumAvailability(Clock clock, Duration ttl, Check check) {
        this.clock = Objects.requireNonNull(clock);
        this.check = Objects.requireNonNull(check);
        if (ttl == null || ttl.isNegative() || ttl.isZero()) throw new IllegalArgumentException("Readiness TTL must be positive");
        this.ttl = ttl;
    }
    public synchronized void requireReady(CurriculumDataset dataset) {
        if (!dataset.source().equals(checkedSource) || !clock.instant().isBefore(expires)) {
            ready = false;
            checkedSource = dataset.source();
            try { check.run(dataset); ready = true; }
            catch (Exception exception) { /* Never retain or log provider payloads. */ }
            expires = clock.instant().plus(ttl);
        }
        if (!ready) throw new CurriculumServiceUnavailableException(
                "Dịch vụ căn cứ chương trình tạm thời không khả dụng; vui lòng thử lại sau.", null);
    }
}
