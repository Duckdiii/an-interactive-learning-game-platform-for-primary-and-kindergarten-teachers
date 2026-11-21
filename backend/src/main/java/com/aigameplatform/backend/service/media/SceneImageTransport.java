package com.aigameplatform.backend.service.media;

import java.io.IOException;
import java.net.InetAddress;
import java.net.URI;

@FunctionalInterface
public interface SceneImageTransport {
    SceneImageResponse get(URI uri, InetAddress pinnedAddress, SceneImagePolicy policy, long deadlineNanos)
            throws IOException;

    default SceneImageResponse get(URI uri, InetAddress pinnedAddress, SceneImagePolicy policy,
            long deadlineNanos, String origin) throws IOException {
        return get(uri, pinnedAddress, policy, deadlineNanos);
    }
}
