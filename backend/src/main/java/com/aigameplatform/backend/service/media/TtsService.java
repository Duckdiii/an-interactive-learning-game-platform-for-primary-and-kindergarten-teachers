package com.aigameplatform.backend.service.media;

import com.aigameplatform.backend.dto.media.SpeechVoice;

public interface TtsService {
    /**
     * Sinh audio từ text, trả về byte[] định dạng MP3.
     */
    byte[] synthesizeSpeech(String text, String languageCode);

    default byte[] synthesizeSpeech(String text, String languageCode, SpeechVoice voice) {
        return synthesizeSpeech(text, languageCode);
    }
}
