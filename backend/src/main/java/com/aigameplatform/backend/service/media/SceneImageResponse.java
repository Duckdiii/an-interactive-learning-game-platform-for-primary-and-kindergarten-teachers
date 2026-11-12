package com.aigameplatform.backend.service.media;

import java.util.Map;

public record SceneImageResponse(int statusCode, Map<String, String> headers, byte[] body) {
    public SceneImageResponse {
        headers = Map.copyOf(headers);
        body = body.clone();
    }

    @Override
    public byte[] body() {
        return body.clone();
    }

    public String header(String name) {
        return headers.entrySet().stream().filter(e -> e.getKey().equalsIgnoreCase(name))
                .map(Map.Entry::getValue).findFirst().orElse(null);
    }
}
