package com.aigameplatform.backend.service.media;

import com.aigameplatform.backend.dto.media.SpeechVoice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.cloud.texttospeech.v1.AudioConfig;
import com.google.cloud.texttospeech.v1.SynthesisInput;
import com.google.cloud.texttospeech.v1.SynthesizeSpeechResponse;
import com.google.cloud.texttospeech.v1.TextToSpeechClient;
import com.google.cloud.texttospeech.v1.VoiceSelectionParams;
import com.google.protobuf.ByteString;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class GoogleCloudTtsServiceTest {

    @Test
    @DisplayName("synthesizeSpeech gọi client với đúng thông số giọng nữ vi-VN-Wavenet-A tốc độ 0.9")
    void testSynthesizeSpeech() {
        TextToSpeechClient mockClient = mock(TextToSpeechClient.class);
        GoogleCloudTtsService service = new GoogleCloudTtsService(mockClient);

        SynthesizeSpeechResponse mockResponse = SynthesizeSpeechResponse.newBuilder()
                .setAudioContent(ByteString.copyFrom(new byte[] {10, 20, 30}))
                .build();

        when(mockClient.synthesizeSpeech(any(SynthesisInput.class), any(VoiceSelectionParams.class), any(AudioConfig.class)))
                .thenReturn(mockResponse);

        byte[] result = service.synthesizeSpeech("Bé hãy lắng nghe", "vi-VN");

        assertThat(result).containsExactly(10, 20, 30);
        verify(mockClient).synthesizeSpeech(any(SynthesisInput.class), any(VoiceSelectionParams.class), any(AudioConfig.class));
    }

    @Test
    void selectedMaleVoiceUsesVietnameseMaleModel() {
        TextToSpeechClient client = mock(TextToSpeechClient.class);
        when(client.synthesizeSpeech(any(SynthesisInput.class), any(VoiceSelectionParams.class), any(AudioConfig.class)))
                .thenReturn(SynthesizeSpeechResponse.getDefaultInstance());
        new GoogleCloudTtsService(client).synthesizeSpeech("Bé hãy lắng nghe", "vi-VN", SpeechVoice.MALE);
        verify(client).synthesizeSpeech(any(SynthesisInput.class), argThat((VoiceSelectionParams voice) ->
                        voice.getName().equals("vi-VN-Wavenet-B") && voice.getLanguageCode().equals("vi-VN")),
                any(AudioConfig.class));
    }

    @Test
    @DisplayName("synthesizeSpeech trả về byte rỗng nếu text null hoặc blank mà không gọi client")
    void testSynthesizeSpeechBlank() {
        TextToSpeechClient mockClient = mock(TextToSpeechClient.class);
        GoogleCloudTtsService service = new GoogleCloudTtsService(mockClient);

        byte[] result1 = service.synthesizeSpeech(null, "vi-VN");
        byte[] result2 = service.synthesizeSpeech("   ", "vi-VN");

        assertThat(result1).isEmpty();
        assertThat(result2).isEmpty();
        verify(mockClient, never()).synthesizeSpeech(any(), any(), any());
    }

    @Test
    @DisplayName("MockTtsService sinh byte MP3 giả lập có thể đọc được")
    void testMockTtsService() {
        MockTtsService mockTts = new MockTtsService();
        byte[] bytes = mockTts.synthesizeSpeech("Xin chào", "vi-VN");

        assertThat(bytes).isNotEmpty();
        assertThat(bytes.length).isGreaterThan(12);
    }
}
