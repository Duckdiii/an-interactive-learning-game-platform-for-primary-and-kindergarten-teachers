package com.aigameplatform.backend.service.curriculum;

import com.aigameplatform.backend.exception.CurriculumServiceUnavailableException;
import java.time.*;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/** A bounded readiness cache; query failures are still checked on every request. */
public final class CurriculumAvailability {
    @FunctionalInterface public interface Check { void run(CurriculumDataset dataset) throws Exception; }
    private final Clock clock;
    private final Duration ttl;
    private final Check check;
    private record CachedReadiness(Instant expires, boolean ready) { }
    private final ConcurrentHashMap<CurriculumSource, CachedReadiness> cache = new ConcurrentHashMap<>();

    public CurriculumAvailability(Clock clock, Duration ttl, Check check) {
        this.clock = Objects.requireNonNull(clock);
        this.check = Objects.requireNonNull(check);
        if (ttl == null || ttl.isNegative() || ttl.isZero()) throw new IllegalArgumentException("Readiness TTL must be positive");
        this.ttl = ttl;
    }
    public void requireReady(CurriculumDataset dataset) {
        Objects.requireNonNull(dataset);
        Instant now = clock.instant();
        CachedReadiness readiness = cache.compute(dataset.source(), (source, current) -> {
            if (current != null && now.isBefore(current.expires())) return current;
            boolean ready;
            try { check.run(dataset); ready = true; }
            catch (Exception exception) { ready = false; /* Never retain or log provider payloads. */ }
            return new CachedReadiness(now.plus(ttl), ready);
        });
        if (!readiness.ready()) throw new CurriculumServiceUnavailableException(
                "Dịch vụ căn cứ chương trình tạm thời không khả dụng; vui lòng thử lại sau.", null);
    }
}
