package com.aigameplatform.backend.service.media;

import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.SpotTheTargetQuestion;
import com.aigameplatform.backend.service.validation.ContentSafetyCheck;
import com.aigameplatform.backend.service.validation.safety.ModerationUnavailableException;
import com.aigameplatform.backend.service.validation.safety.OpenAiModerationClient;
import java.net.URI;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class RegenerationIllustrations {
    private final PexelsClient photos;
    private final SceneImageLoader images;
    private final OpenAiModerationClient moderation;
    private final ContentSafetyCheck safety;

    public RegenerationIllustrations(PexelsClient photos, SceneImageLoader images, OpenAiModerationClient moderation,
            ContentSafetyCheck safety) {
        this.photos = photos;
        this.images = images;
        this.moderation = moderation;
        this.safety = safety;
    }

    public void enrich(List<? extends QuestionGame> questions) {
        for (QuestionGame question : questions) {
            // Spot-the-target coordinates are tied to its scene, so an unrelated stock image cannot stand in.
            if (question instanceof SpotTheTargetQuestion || question.getImageUrl() != null || question.getVisualPrompt() == null
                    || question.getVisualPrompt().isBlank()) continue;
            for (var photo : photos.searchOnline(question.getVisualPrompt(), 2)) {
                try {
                    if (photo.url().length() > 2048) continue;
                    URI url = URI.create(photo.url());
                    if (!"https".equalsIgnoreCase(url.getScheme())
                            || !"images.pexels.com".equalsIgnoreCase(url.getHost())) continue;
                    LoadedSceneImage image = images.load(url);
                    if (!safety.isUnsafe(moderation.moderateImage(image.bytes(), image.mediaType()))) {
                        question.setImageUrl(url.toString());
                        break;
                    }
                } catch (ModerationUnavailableException unavailable) {
                    return;
                } catch (InvalidSceneImageException | SceneImageUnavailableException | IllegalArgumentException invalid) {
                    // Try another search result when the image cannot be safely loaded.
                }
            }
        }
    }
}
