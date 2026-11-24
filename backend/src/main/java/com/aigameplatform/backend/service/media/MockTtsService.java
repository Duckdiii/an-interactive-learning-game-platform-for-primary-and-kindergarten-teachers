package com.aigameplatform.backend.service.media;

import com.aigameplatform.backend.dto.media.SpeechVoice;

import java.nio.charset.StandardCharsets;

public class MockTtsService implements TtsService {
    // Standard minimal MP3 frame header
    private static final byte[] MOCK_MP3_HEADER = new byte[] {
            (byte) 0xFF, (byte) 0xFB, (byte) 0x90, (byte) 0x64,
            0, 0, 0, 0, 0, 0, 0, 0
    };

    @Override
    public byte[] synthesizeSpeech(String text, String languageCode, SpeechVoice voice) {
        return new byte[0];
    }

    @Override
    public byte[] synthesizeSpeech(String text, String languageCode) {
        if (text == null || text.isBlank()) {
            return new byte[0];
        }
        byte[] textBytes = text.getBytes(StandardCharsets.UTF_8);
        byte[] result = new byte[MOCK_MP3_HEADER.length + textBytes.length];
        System.arraycopy(MOCK_MP3_HEADER, 0, result, 0, MOCK_MP3_HEADER.length);
        System.arraycopy(textBytes, 0, result, MOCK_MP3_HEADER.length, textBytes.length);
        return result;
    }
}
