package com.aigameplatform.backend.service.media;

import com.google.cloud.texttospeech.v1.AudioConfig;
import com.google.cloud.texttospeech.v1.AudioEncoding;
import com.google.cloud.texttospeech.v1.SsmlVoiceGender;
import com.google.cloud.texttospeech.v1.SynthesisInput;
import com.google.cloud.texttospeech.v1.SynthesizeSpeechResponse;
import com.google.cloud.texttospeech.v1.TextToSpeechClient;
import com.google.cloud.texttospeech.v1.VoiceSelectionParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class GoogleCloudTtsService implements TtsService {
    private static final Logger log = LoggerFactory.getLogger(GoogleCloudTtsService.class);
    private final TextToSpeechClient ttsClient;

    public GoogleCloudTtsService(TextToSpeechClient ttsClient) {
        this.ttsClient = ttsClient;
    }

    @Override
    public byte[] synthesizeSpeech(String text, String languageCode) {
        if (text == null || text.isBlank()) {
            return new byte[0];
        }
        String lang = (languageCode != null && !languageCode.isBlank()) ? languageCode : "vi-VN";
        SynthesisInput input = SynthesisInput.newBuilder().setText(text).build();
        VoiceSelectionParams voice = VoiceSelectionParams.newBuilder()
                .setLanguageCode(lang)
                .setName("vi-VN-Wavenet-A")
                .setSsmlGender(SsmlVoiceGender.FEMALE)
                .build();
        AudioConfig audioConfig = AudioConfig.newBuilder()
                .setAudioEncoding(AudioEncoding.MP3)
                .setSpeakingRate(0.9)
                .build();

        log.debug("Synthesizing speech for text length {} in language {}", text.length(), lang);
        SynthesizeSpeechResponse response = ttsClient.synthesizeSpeech(input, voice, audioConfig);
        return response.getAudioContent().toByteArray();
    }
}
