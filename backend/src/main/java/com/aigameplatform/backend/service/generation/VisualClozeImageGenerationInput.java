package com.aigameplatform.backend.service.generation;

import com.aigameplatform.backend.service.media.LoadedSceneImage;
import java.util.List;

/** Ephemeral IMAGE-mode input; the URL and bytes must never be written to durable logs or caches. */
public record VisualClozeImageGenerationInput(String sceneImageUrl, LoadedSceneImage sceneImage,
        List<VisualClozeOptionImageInput> optionImages) {

    public VisualClozeImageGenerationInput(String sceneImageUrl, LoadedSceneImage sceneImage) {
        this(sceneImageUrl, sceneImage, List.of());
    }

    public VisualClozeImageGenerationInput {
        if (sceneImageUrl == null || sceneImageUrl.isBlank() || sceneImage == null) {
            throw new IllegalArgumentException("IMAGE mode requires a scene URL and validated scene bytes");
        }
        optionImages = optionImages == null ? List.of() : List.copyOf(optionImages);
    }
}
