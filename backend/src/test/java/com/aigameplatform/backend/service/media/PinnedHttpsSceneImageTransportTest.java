package com.aigameplatform.backend.service.media;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import org.junit.jupiter.api.Test;

class PinnedHttpsSceneImageTransportTest {
    @Test
    void imageRequestIdentifiesTheApplicationToTheRemoteServer() throws Exception {
        var method = PinnedHttpsSceneImageTransport.class.getDeclaredMethod("request", URI.class, String.class);
        method.setAccessible(true);
        String request = (String) method.invoke(null, URI.create("https://images.example/image.png"), null);
        assertThat(request).contains("User-Agent: InteractiveLearningGamePlatform/1.0\r\n");
    }
}
