package com.aigameplatform.backend.service.lesson;

import java.net.URI;
import java.util.Locale;

final class Fr02LiveDatabaseTarget {
    private Fr02LiveDatabaseTarget() {}

    static boolean isAllowed(String jdbcUrl, String expectedHost) {
        if (jdbcUrl == null || expectedHost == null || expectedHost.isBlank()) return false;
        try {
            URI uri = URI.create(jdbcUrl.trim().replaceFirst("(?i)^jdbc:", ""));
            String host = uri.getHost();
            if (!"postgresql".equalsIgnoreCase(uri.getScheme()) || host == null
                    || !host.equalsIgnoreCase(expectedHost)) {
                return false;
            }
            String normalizedHost = host.toLowerCase(Locale.ROOT);
            boolean supabaseHost = normalizedHost.endsWith(".supabase.co")
                    || normalizedHost.endsWith(".supabase.com");
            return supabaseHost && uri.getPort() != 6543;
        } catch (IllegalArgumentException malformedUrl) {
            return false;
        }
    }
}
