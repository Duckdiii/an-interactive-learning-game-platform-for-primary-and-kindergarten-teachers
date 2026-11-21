package com.aigameplatform.backend.service.media;

public record LoadedSceneImage(byte[] bytes, String mediaType, int width, int height) {
    public LoadedSceneImage {
        bytes = bytes.clone();
    }

    @Override
    public byte[] bytes() {
        return bytes.clone();
    }
}
