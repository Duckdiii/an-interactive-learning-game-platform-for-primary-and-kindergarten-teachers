package com.aigameplatform.backend.service.media;

import java.io.IOException;

final class SceneImageBodyTooLargeException extends IOException {
    SceneImageBodyTooLargeException() {
        super("HTTP body exceeds scene-image limit");
    }
}
