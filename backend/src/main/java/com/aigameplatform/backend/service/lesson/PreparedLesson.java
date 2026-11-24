package com.aigameplatform.backend.service.lesson;

/** Short, request-local content for the teacher to review; never logged or persisted here. */
public record PreparedLesson(String idea) {
    @Override public String toString() { return "PreparedLesson[redacted]"; }
}
