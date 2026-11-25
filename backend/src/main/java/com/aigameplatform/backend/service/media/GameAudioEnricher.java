package com.aigameplatform.backend.service.media;

import com.aigameplatform.backend.dto.media.SpeechVoice;

import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.QuizQuestion;
import com.aigameplatform.backend.entity.question.VisualClozeQuestion;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class GameAudioEnricher {
    private static final Logger log = LoggerFactory.getLogger(GameAudioEnricher.class);

    private final TtsService ttsService;
    private final MediaStorageService mediaStorageService;

    public GameAudioEnricher(TtsService ttsService, MediaStorageService mediaStorageService) {
        this.ttsService = ttsService;
        this.mediaStorageService = mediaStorageService;
    }

    /**
     * Sinh âm thanh đọc câu hỏi và đính kèm audioUrl vào entity QuestionGame.
     */
    public void enrichWithAudio(QuestionGame question) {
        enrichWithAudio(question, null);
    }

    private void enrichWithAudio(QuestionGame question, SpeechVoice voice) {
        if (question == null) return;

        String textToSpeak = question.getAudioText();
        if ((textToSpeak == null || textToSpeak.isBlank()) && question instanceof QuizQuestion qq) {
            textToSpeak = qq.getText();
        }

        if ((textToSpeak == null || textToSpeak.isBlank()) && question instanceof VisualClozeQuestion cloze) {
            textToSpeak = cloze.getQuestionText();
        }
        if (textToSpeak == null || textToSpeak.isBlank()) {
            return;
        }

        try {
            byte[] audioBytes = voice == null ? ttsService.synthesizeSpeech(textToSpeak, "vi-VN")
                    : ttsService.synthesizeSpeech(textToSpeak, "vi-VN", voice);
            if (audioBytes != null && audioBytes.length > 0) {
                String fileName = "tts/" + UUID.randomUUID() + ".mp3";
                String audioUrl = mediaStorageService.upload(fileName, audioBytes, "audio/mpeg");
                question.setAudioUrl(audioUrl);
            }
        } catch (Exception e) {
            log.warn("Failed to synthesize or store question audio ({})", e.getClass().getSimpleName());
            // Fail-safe: không làm hỏng cả luồng tạo game khi TTS hoặc storage gặp sự cố
        }
    }

    /**
     * Chạy song song sinh audio cho toàn bộ danh sách câu hỏi của một game bằng CompletableFuture.
     */
    public void enrichAllQuestionsWithAudio(List<? extends QuestionGame> questions) {
        enrichAllQuestionsWithAudio(questions, null);
    }

    public void enrichAllQuestionsWithAudio(List<? extends QuestionGame> questions, SpeechVoice voice) {
        if (questions == null || questions.isEmpty()) return;

        List<CompletableFuture<Void>> futures = questions.stream()
                .map(q -> CompletableFuture.runAsync(() -> enrichWithAudio(q, voice)))
                .toList();

        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
    }
}
