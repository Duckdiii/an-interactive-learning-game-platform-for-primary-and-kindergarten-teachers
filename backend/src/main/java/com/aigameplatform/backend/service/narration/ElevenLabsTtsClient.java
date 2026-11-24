package com.aigameplatform.backend.service.narration;

import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.Map;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class ElevenLabsTtsClient {
    private static final String TTS_ENDPOINT = "https://api.elevenlabs.io/v1/text-to-speech";
    private static final String DEFAULT_MODEL = "eleven_flash_v2_5";

    private final RestClient restClient;
    private final String apiKey;
    private final String voiceId;
    private final String modelId;
    private final Mp3AudioValidator validator;

    public ElevenLabsTtsClient(@Qualifier("elevenLabsRestClientBuilder") RestClient.Builder builder,
            @Value("${app.narration.elevenlabs.api-key:}") String apiKey,
            @Value("${app.narration.elevenlabs.voice-id:JBFqnCBsd6RMkjVDRZzb}") String voiceId,
            @Value("${app.narration.elevenlabs.model-id:" + DEFAULT_MODEL + "}") String modelId,
            Mp3AudioValidator validator) {
        this.restClient = builder.build();
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.voiceId = voiceId == null ? "" : voiceId.trim();
        this.modelId = modelId == null ? "" : modelId.trim();
        this.validator = validator;
    }

    public SynthesizedAudio synthesizeEnglish(String sourceText) {
        if (sourceText == null || sourceText.isBlank())
            throw new IllegalArgumentException("Narration text is required");
        String text = Normalizer.normalize(sourceText.trim(), Normalizer.Form.NFC);
        if (text.codePointCount(0, text.length()) > ViettelTtsClient.MAX_TEXT_CODEPOINTS)
            throw new IllegalArgumentException("Narration text exceeds 300 Unicode characters");
        if (apiKey.isBlank()) throw new IllegalStateException("Configure ELEVENLABS_API_KEY before generating narration");
        if (voiceId.isBlank()) throw new IllegalStateException("Configure ELEVENLABS_VOICE_ID before generating narration");
        if (modelId.isBlank()) throw new IllegalStateException("Configure ELEVENLABS_MODEL_ID before generating narration");

        String requestUri = UriComponentsBuilder.fromUriString(TTS_ENDPOINT)
                .pathSegment(voiceId)
                .queryParam("output_format", "mp3_44100_128")
                .queryParam("enable_logging", false)
                .build().encode().toUriString();
        byte[] audio = restClient.post().uri(requestUri)
                .header("xi-api-key", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.valueOf("audio/mpeg"))
                .body(Map.of("text", text, "model_id", modelId))
                .exchange((request, response) -> {
                    try (response) {
                        if (!response.getStatusCode().is2xxSuccessful())
                            throw new IllegalStateException("ElevenLabs TTS returned HTTP "
                                    + response.getStatusCode().value());
                        if (response.getHeaders().getContentLength() > Mp3AudioValidator.MAX_FILE_BYTES)
                            throw oversizedAudio();
                        return readBoundedAudio(response.getBody());
                    }
                });
        return new SynthesizedAudio(audio, validator.validate(audio));
    }

    static byte[] readBoundedAudio(InputStream body) {
        try {
            byte[] audio = body.readNBytes(Mp3AudioValidator.MAX_FILE_BYTES + 1);
            if (audio.length > Mp3AudioValidator.MAX_FILE_BYTES) throw oversizedAudio();
            return audio;
        } catch (IOException failure) {
            throw new IllegalStateException("Unable to read ElevenLabs TTS audio response", failure);
        }
    }

    private static IllegalArgumentException oversizedAudio() {
        return new IllegalArgumentException("MP3 exceeds 256 KiB per file");
    }

    String voiceId() {
        return voiceId;
    }

    String modelId() {
        return modelId;
    }
}
