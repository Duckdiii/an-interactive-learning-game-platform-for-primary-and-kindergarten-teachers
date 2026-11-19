package com.aigameplatform.backend.service.media;

public interface TtsService {
    /**
     * Sinh audio từ text, trả về byte[] định dạng MP3.
     */
    byte[] synthesizeSpeech(String text, String languageCode);
}
