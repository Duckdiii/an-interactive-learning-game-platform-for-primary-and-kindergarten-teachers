package com.aigameplatform.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.game.AiRequestRateLimiter;
import com.aigameplatform.backend.service.media.LocalMediaStorageService;
import com.aigameplatform.backend.service.media.MediaUploadService;
import com.aigameplatform.backend.service.media.SceneImagePolicy;
import com.aigameplatform.backend.service.validation.ContentSafetyCheck;
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import com.aigameplatform.backend.service.validation.safety.ModerationResult;
import com.aigameplatform.backend.service.validation.safety.OpenAiModerationClient;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.json.JsonMapper;

class MediaControllerTest {
    @TempDir Path mediaDirectory;

    @AfterEach
    void clearPrincipal() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void uploadRequiresAuthenticationAndApprovedMediaCanThenBeReadWithoutSession() throws Exception {
        var storage = new LocalMediaStorageService(mediaDirectory.toString(), "https://api.example.test/media");
        var moderation = mock(OpenAiModerationClient.class);
        when(moderation.moderateImage(any(), eq("image/png"))).thenReturn(new ModerationResult(false, List.of()));
        var policy = new SceneImagePolicy(8388608, 10000, 8000000, 67108864, 4, 3,
                Duration.ofSeconds(5), Duration.ofSeconds(12));
        var blockedWords = new BlockedWordList(List.of());
        var uploads = new MediaUploadService(storage, moderation, blockedWords,
                new AiRequestRateLimiter(Clock.systemUTC()), policy, new ContentSafetyCheck(blockedWords, moderation, false));
        var mvc = MockMvcBuilders.standaloneSetup(new MediaController(uploads, storage))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();
        var image = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", image);
        var upload = multipart("/api/media/upload").file(
                new MockMultipartFile("file", "photo.png", "image/png", image.toByteArray()));

        mvc.perform(upload).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));

        var principal = new AuthenticatedTeacher("teacher-1", "teacher@example.test", "session");
        SecurityContextHolder.getContext().setAuthentication(
                UsernamePasswordAuthenticationToken.authenticated(principal, null, List.of()));
        mvc.perform(multipart("/api/media/upload")).andExpect(status().isUnprocessableContent())
                .andExpect(jsonPath("$.error.code").value("FILE_TOO_LARGE_OR_INVALID_FORMAT"));
        String response = mvc.perform(upload).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.mediaType").value("IMAGE"))
                .andReturn().getResponse().getContentAsString();
        String url = JsonMapper.shared().readTree(response).path("data").path("mediaUrl").asString();

        SecurityContextHolder.clearContext();
        mvc.perform(get(URI.create(url).getPath())).andExpect(status().isOk())
                .andExpect(content().contentType("image/png"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
        mvc.perform(get("/media/uploads/unknown.png")).andExpect(status().isNotFound());
    }
}
