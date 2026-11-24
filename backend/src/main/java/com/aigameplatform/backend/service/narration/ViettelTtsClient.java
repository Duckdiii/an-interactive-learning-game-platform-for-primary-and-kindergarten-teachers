package com.aigameplatform.backend.service.narration;

import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class ViettelTtsClient {
    public static final int MAX_TEXT_CODEPOINTS = 300;
    public static final String DEFAULT_VOICE = "hn-quynhanh";
    private static final String TTS_ENDPOINT = "https://viettelai.vn/tts/speech_synthesis";

    private final RestClient restClient;
    private final String token;
    private final Mp3AudioValidator validator;

    public ViettelTtsClient(RestClient.Builder builder,
            @Value("${app.narration.viettel.token:}") String token,
            Mp3AudioValidator validator) {
        this.restClient = builder.build();
        this.token = token;
        this.validator = validator;
    }

    public SynthesizedAudio synthesizeVietnamese(String sourceText) {
        if (sourceText == null || sourceText.isBlank()) throw new IllegalArgumentException("Narration text is required");
        String text = Normalizer.normalize(sourceText.trim(), Normalizer.Form.NFC);
        if (text.codePointCount(0, text.length()) > MAX_TEXT_CODEPOINTS)
            throw new IllegalArgumentException("Narration text exceeds 300 Unicode characters");
        if (token == null || token.isBlank())
            throw new IllegalStateException("Configure VIETTEL_TTS_TOKEN before generating narration");

        byte[] audio = restClient.post().uri(TTS_ENDPOINT)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.ALL)
                .body(Map.of(
                        "text", text,
                        "voice", DEFAULT_VOICE,
                        "speed", 1.0,
                        "tts_return_option", 3,
                        "token", token.trim(),
                        "without_filter", false))
                .exchange((request, response) -> {
                    try (response) {
                        if (!response.getStatusCode().is2xxSuccessful())
                            throw new IllegalStateException("Viettel TTS returned HTTP "
                                    + response.getStatusCode().value());
                        if (response.getHeaders().getContentLength() > Mp3AudioValidator.MAX_FILE_BYTES)
                            throw oversizedAudio();
                        return readBoundedAudio(response.getBody());
                    }
                });
        double durationSeconds = validator.validate(audio);
        return new SynthesizedAudio(audio, durationSeconds);
    }

    static byte[] readBoundedAudio(InputStream body) {
        try {
            byte[] audio = body.readNBytes(Mp3AudioValidator.MAX_FILE_BYTES + 1);
            if (audio.length > Mp3AudioValidator.MAX_FILE_BYTES) throw oversizedAudio();
            return audio;
        } catch (IOException failure) {
            throw new IllegalStateException("Unable to read Viettel TTS audio response", failure);
        }
    }

    private static IllegalArgumentException oversizedAudio() {
        return new IllegalArgumentException("MP3 exceeds 256 KiB per file");
    }

}
