package com.aigameplatform.backend.service.generation;

import com.aigameplatform.backend.service.media.LoadedSceneImage;

/** Teacher-provided option image bytes and their display prompt, retained only for this generation request. */
public record VisualClozeOptionImageInput(String imageUrl, String visualPrompt, LoadedSceneImage image) {
    public VisualClozeOptionImageInput {
        if (imageUrl == null || imageUrl.isBlank() || visualPrompt == null || visualPrompt.isBlank() || image == null) {
            throw new IllegalArgumentException("Option image URL, prompt, and validated bytes are required");
        }
    }
}
