package com.aigameplatform.backend.service.narration;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

/** Opt-in live smoke for the real Viettel TTS and Supabase Storage services. */
@EnabledIfSystemProperty(named = "fr11.supabase.live", matches = "true")
class ViettelTtsSupabaseLiveTest {
    @Test
    @Timeout(90)
    void synthesizesUploadsReadsAndDeletesRealMp3() throws Exception {
        String token = System.getenv("VIETTEL_TTS_TOKEN");
        String storageUrl = System.getenv("SUPABASE_URL");
        String serviceRoleKey = System.getenv("SUPABASE_SERVICE_ROLE_KEY");
        String bucket = System.getenv().getOrDefault("TTS_STORAGE_BUCKET", "game-narration");
        assertThat(token).as("VIETTEL_TTS_TOKEN must be set").isNotBlank();
        assertThat(storageUrl).as("SUPABASE_URL must be set").isNotBlank();
        assertThat(serviceRoleKey).as("SUPABASE_SERVICE_ROLE_KEY must be set").isNotBlank();
        assertThat(bucket).as("TTS_STORAGE_BUCKET must be set").isNotBlank();

        var tts = new ViettelTtsClient(RestClient.builder(), token, new Mp3AudioValidator());
        var storage = new SupabaseNarrationStorage(RestClient.builder(), storageUrl, serviceRoleKey, bucket);
        byte[] expectedAudio = tts.synthesizeVietnamese("Xin chào, đây là kiểm tra lưu trữ âm thanh.").audio();
        String objectPath = "fr11-live-smoke/" + UUID.randomUUID() + ".mp3";
        String signedUrl = null;
        boolean uploaded = false;

        try {
            storage.upload(objectPath, expectedAudio);
            uploaded = true;
            signedUrl = storage.createSignedUrl(objectPath, 60);

            HttpClient http = HttpClient.newHttpClient();
            HttpResponse<byte[]> downloaded = http.send(
                    HttpRequest.newBuilder(URI.create(signedUrl)).GET().build(),
                    HttpResponse.BodyHandlers.ofByteArray());
            assertThat(downloaded.statusCode()).isEqualTo(200);
            assertThat(downloaded.body()).containsExactly(expectedAudio);
        } finally {
            if (uploaded) {
                storage.delete(List.of(objectPath));
                List<Map<String, Object>> remainingObjects = RestClient.builder().build().post()
                        .uri(storageUrl.replaceAll("/+$", "") + "/storage/v1/object/list/" + bucket)
                        .headers(headers -> {
                            headers.setBearerAuth(serviceRoleKey);
                            headers.set("apikey", serviceRoleKey);
                        })
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("prefix", "fr11-live-smoke/", "limit", 100, "offset", 0))
                        .retrieve()
                        .body(new ParameterizedTypeReference<>() { });
                assertThat(remainingObjects).isNotNull()
                        .noneMatch(object -> objectPath.equals(object.get("name")));
            }
        }
    }
}
