package com.aigameplatform.backend.service.narration;

/** A provider-neutral MP3 result after format and duration validation. */
public record SynthesizedAudio(byte[] audio, double durationSeconds) { }
