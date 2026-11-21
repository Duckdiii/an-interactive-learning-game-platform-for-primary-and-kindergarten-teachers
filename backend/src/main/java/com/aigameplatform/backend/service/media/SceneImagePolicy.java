package com.aigameplatform.backend.service.media;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class SceneImagePolicy {
    private final long maxBytes;
    private final int maxDimension;
    private final long maxPixels;
    private final long maxDecodedBytes;
    private final int maxConcurrentLoads;
    private final int maxRedirects;
    private final Duration connectTimeout;
    private final Duration requestTimeout;

    public SceneImagePolicy(
            @Value("${app.scene-image.max-bytes:8388608}") long maxBytes,
            @Value("${app.scene-image.max-dimension:10000}") int maxDimension,
            @Value("${app.scene-image.max-pixels:8000000}") long maxPixels,
            @Value("${app.scene-image.max-decoded-bytes:67108864}") long maxDecodedBytes,
            @Value("${app.scene-image.max-concurrent-loads:4}") int maxConcurrentLoads,
            @Value("${app.scene-image.max-redirects:3}") int maxRedirects,
            @Value("${app.scene-image.connect-timeout:5s}") Duration connectTimeout,
            @Value("${app.scene-image.request-timeout:12s}") Duration requestTimeout) {
        if (maxBytes < 1 || maxDimension < 1 || maxPixels < 1 || maxDecodedBytes < 1
                || maxConcurrentLoads < 1 || maxRedirects < 0
                || connectTimeout.isZero() || connectTimeout.isNegative()
                || requestTimeout.isZero() || requestTimeout.isNegative()) {
            throw new IllegalArgumentException("Scene image policy values must be positive and redirects non-negative");
        }
        this.maxBytes = maxBytes;
        this.maxDimension = maxDimension;
        this.maxPixels = maxPixels;
        this.maxDecodedBytes = maxDecodedBytes;
        this.maxConcurrentLoads = maxConcurrentLoads;
        this.maxRedirects = maxRedirects;
        this.connectTimeout = connectTimeout;
        this.requestTimeout = requestTimeout;
    }

    public long maxBytes() { return maxBytes; }
    public int maxDimension() { return maxDimension; }
    public long maxPixels() { return maxPixels; }
    public long maxDecodedBytes() { return maxDecodedBytes; }
    public int maxConcurrentLoads() { return maxConcurrentLoads; }
    public int maxRedirects() { return maxRedirects; }
    public Duration connectTimeout() { return connectTimeout; }
    public Duration requestTimeout() { return requestTimeout; }
}
