package com.aigameplatform.backend.service.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.media.PexelsImageDto;
import com.aigameplatform.backend.entity.question.QuizQuestion;
import com.aigameplatform.backend.service.validation.safety.OpenAiModerationClient;
import com.aigameplatform.backend.service.validation.safety.ModerationResult;
import java.net.URI;
import java.util.List;
import org.junit.jupiter.api.Test;

class RegenerationIllustrationsTest {
    @Test
    void skipsFlaggedImageAndAttachesOnlyModeratedResult() {
        var pexels = mock(PexelsClient.class);
        var loader = mock(SceneImageLoader.class);
        var moderation = mock(OpenAiModerationClient.class);
        String flagged = "https://images.pexels.com/unsafe.jpg";
        String safe = "https://images.pexels.com/safe.jpg";
        byte[] flaggedBytes = {1};
        byte[] safeBytes = {2};
        when(pexels.searchOnline("apple", 2)).thenReturn(List.of(
                new PexelsImageDto(1, flagged, flagged), new PexelsImageDto(2, safe, safe)));
        when(loader.load(URI.create(flagged))).thenReturn(new LoadedSceneImage(flaggedBytes, "image/jpeg", 1, 1));
        when(loader.load(URI.create(safe))).thenReturn(new LoadedSceneImage(safeBytes, "image/jpeg", 1, 1));
        when(moderation.moderateImage(flaggedBytes, "image/jpeg")).thenReturn(new ModerationResult(true, List.of()));
        when(moderation.moderateImage(safeBytes, "image/jpeg")).thenReturn(new ModerationResult(false, List.of()));
        var question = new QuizQuestion();
        question.setVisualPrompt("apple");

        new RegenerationIllustrations(pexels, loader, moderation).enrich(List.of(question));

        assertThat(question.getImageUrl()).isEqualTo(safe);
    }
}
