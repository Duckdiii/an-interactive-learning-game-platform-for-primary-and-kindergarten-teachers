package com.aigameplatform.backend.service.media;

public class InvalidSceneImageException extends RuntimeException {
    public InvalidSceneImageException(String message) {
        super(message);
    }

    public InvalidSceneImageException(String message, Throwable cause) {
        super(message, cause);
    }
}
