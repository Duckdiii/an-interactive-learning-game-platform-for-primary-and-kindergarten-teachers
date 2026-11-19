package com.aigameplatform.backend.service.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.entity.question.QuizQuestion;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class GameAudioEnricherTest {

    private TtsService ttsService;
    private MediaStorageService mediaStorageService;
    private GameAudioEnricher enricher;

    @BeforeEach
    void setUp() {
        ttsService = mock(TtsService.class);
        mediaStorageService = mock(MediaStorageService.class);
        enricher = new GameAudioEnricher(ttsService, mediaStorageService);
    }

    @Test
    @DisplayName("enrichWithAudio tổng hợp giọng đọc từ audioText và gán audioUrl")
    void testEnrichWithAudioFromAudioText() {
        QuizQuestion question = new QuizQuestion();
        question.setAudioText("Hãy chọn số lớn nhất");
        question.setText("Câu 1");

        when(ttsService.synthesizeSpeech("Hãy chọn số lớn nhất", "vi-VN"))
                .thenReturn(new byte[] {1, 2, 3, 4});
        when(mediaStorageService.upload(anyString(), any(byte[].class), eq("audio/mpeg")))
                .thenReturn("http://localhost:8080/media/tts/sample.mp3");

        enricher.enrichWithAudio(question);

        assertThat(question.getAudioUrl()).isEqualTo("http://localhost:8080/media/tts/sample.mp3");
        verify(ttsService).synthesizeSpeech("Hãy chọn số lớn nhất", "vi-VN");
    }

    @Test
    @DisplayName("enrichWithAudio dùng question text nếu audioText bị null")
    void testEnrichWithAudioFallbackToQuestionText() {
        QuizQuestion question = new QuizQuestion();
        question.setText("Con hãy tìm con mèo");

        when(ttsService.synthesizeSpeech("Con hãy tìm con mèo", "vi-VN"))
                .thenReturn(new byte[] {5, 6, 7});
        when(mediaStorageService.upload(anyString(), any(byte[].class), eq("audio/mpeg")))
                .thenReturn("http://localhost:8080/media/tts/cat.mp3");

        enricher.enrichWithAudio(question);

        assertThat(question.getAudioUrl()).isEqualTo("http://localhost:8080/media/tts/cat.mp3");
    }

    @Test
    @DisplayName("enrichWithAudio không gọi TTS nếu cả audioText và question text đều trống")
    void testEnrichWithAudioEmptyText() {
        QuizQuestion question = new QuizQuestion();

        enricher.enrichWithAudio(question);

        assertThat(question.getAudioUrl()).isNull();
        verify(ttsService, never()).synthesizeSpeech(anyString(), anyString());
        verify(mediaStorageService, never()).upload(anyString(), any(), anyString());
    }

    @Test
    @DisplayName("enrichWithAudio không làm crash nếu TTS service ném ngoại lệ (fail-safe)")
    void testEnrichWithAudioTtsFailureFailSafe() {
        QuizQuestion question = new QuizQuestion();
        question.setAudioText("Nội dung lỗi");

        when(ttsService.synthesizeSpeech(anyString(), anyString()))
                .thenThrow(new RuntimeException("TTS Quota Exceeded"));

        enricher.enrichWithAudio(question);

        assertThat(question.getAudioUrl()).isNull();
    }

    @Test
    @DisplayName("enrichAllQuestionsWithAudio xử lý song song danh sách câu hỏi")
    void testEnrichAllQuestionsWithAudio() {
        QuizQuestion q1 = new QuizQuestion();
        q1.setAudioText("Câu hỏi 1");
        QuizQuestion q2 = new QuizQuestion();
        q2.setAudioText("Câu hỏi 2");

        when(ttsService.synthesizeSpeech(anyString(), eq("vi-VN")))
                .thenReturn(new byte[] {1, 2});
        when(mediaStorageService.upload(anyString(), any(), eq("audio/mpeg")))
                .thenReturn("http://localhost:8080/media/tts/audio.mp3");

        enricher.enrichAllQuestionsWithAudio(List.of(q1, q2));

        assertThat(q1.getAudioUrl()).isEqualTo("http://localhost:8080/media/tts/audio.mp3");
        assertThat(q2.getAudioUrl()).isEqualTo("http://localhost:8080/media/tts/audio.mp3");
    }
}
