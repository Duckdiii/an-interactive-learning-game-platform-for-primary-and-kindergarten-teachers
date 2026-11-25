package com.aigameplatform.backend.service.lesson;

/** Request-local data. Never include document contents in diagnostics. */
public record ExtractedLesson(String text) {
    @Override public String toString() { return "ExtractedLesson[redacted]"; }
}
