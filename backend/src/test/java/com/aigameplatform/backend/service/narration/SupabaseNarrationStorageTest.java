package com.aigameplatform.backend.service.narration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class SupabaseNarrationStorageTest {
    private static final String STORAGE_URL = "https://project.supabase.co";

    @Test
    void uploadsWithServerCredentialAndReturnsShortLivedSignedUrl() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        SupabaseNarrationStorage storage = new SupabaseNarrationStorage(builder, STORAGE_URL, "secret-server-key", "game-narration");
        server.expect(requestTo(STORAGE_URL + "/storage/v1/object/game-narration/game-1/q-1/hash.mp3"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer secret-server-key"))
                .andExpect(header("x-upsert", "true"))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        server.expect(requestTo(STORAGE_URL + "/storage/v1/object/sign/game-narration/game-1/q-1/hash.mp3"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"signedURL\":\"/storage/v1/object/sign/game-narration/game-1/q-1/hash.mp3?token=temporary\"}",
                        MediaType.APPLICATION_JSON));

        storage.upload("game-1/q-1/hash.mp3", new byte[] {1, 2});
        assertThat(storage.createSignedUrl("game-1/q-1/hash.mp3", 600))
                .isEqualTo(STORAGE_URL + "/storage/v1/object/sign/game-narration/game-1/q-1/hash.mp3?token=temporary");
        server.verify();
    }

    @Test
    void rejectsUnboundedSignedUrlLifetimeBeforeNetworkRequest() {
        SupabaseNarrationStorage storage = new SupabaseNarrationStorage(RestClient.builder(), STORAGE_URL, "key", "bucket");

        assertThatThrownBy(() -> storage.createSignedUrl("audio.mp3", 601))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("600 seconds");
    }

    @Test
    void resolvesStorageRelativeSignedUrlAgainstTheStorageApiPath() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        SupabaseNarrationStorage storage = new SupabaseNarrationStorage(builder, STORAGE_URL, "key", "bucket");
        server.expect(requestTo(STORAGE_URL + "/storage/v1/object/sign/bucket/audio.mp3"))
                .andRespond(withSuccess("{\"signedURL\":\"/object/sign/bucket/audio.mp3?token=x\"}",
                        MediaType.APPLICATION_JSON));

        assertThat(storage.createSignedUrl("audio.mp3", 60))
                .isEqualTo(STORAGE_URL + "/storage/v1/object/sign/bucket/audio.mp3?token=x");
        server.verify();
    }

    @Test
    void rejectsMissingServerStorageConfiguration() {
        SupabaseNarrationStorage storage = new SupabaseNarrationStorage(RestClient.builder(), "", "", "bucket");

        assertThatThrownBy(() -> storage.upload("audio.mp3", new byte[] {1}))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SUPABASE_SERVICE_ROLE_KEY");
    }
}
