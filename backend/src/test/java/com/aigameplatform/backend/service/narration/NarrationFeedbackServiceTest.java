package com.aigameplatform.backend.service.narration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.SharedNarrationAsset;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.SharedNarrationAssetRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NarrationFeedbackServiceTest {
    private static final AuthenticatedTeacher TEACHER =
            new AuthenticatedTeacher("teacher-1", "teacher@example.invalid", "session-1");

    @Mock private GameRepository games;
    @Mock private SharedNarrationAssetRepository assets;
    @Mock private ViettelTtsClient viettel;
    @Mock private ElevenLabsTtsClient elevenLabs;
    @Mock private SupabaseNarrationStorage storage;

    private NarrationFeedbackService service;
    private final Map<String, SharedNarrationAsset> cache = new HashMap<>();

    @BeforeEach
    void setUp() {
        service = new NarrationFeedbackService(games, assets, viettel, elevenLabs, storage,
                new Mp3AudioValidator(), "1");
        lenient().when(assets.findByCacheKey(anyString())).thenAnswer(call ->
                Optional.ofNullable(cache.get(call.getArgument(0))));
        lenient().when(assets.saveAndFlush(any(SharedNarrationAsset.class))).thenAnswer(call -> {
            SharedNarrationAsset asset = call.getArgument(0);
            cache.put(asset.getCacheKey(), asset);
            return asset;
        });
        lenient().when(storage.createSignedUrl(anyString(), org.mockito.ArgumentMatchers.eq(600)))
                .thenAnswer(call -> "https://storage.test/" + call.getArgument(0));
    }

    @Test
    void synthesizesAndStoresOnlyTheTwoFixedVietnameseFeedbackPhrasesOnCacheMiss() {
        Game game = game("game-1", Subject.MATH);
        when(games.findByIdAndAuthor_Id("game-1", "teacher-1")).thenReturn(Optional.of(game));
        when(viettel.synthesizeVietnamese("Đúng rồi!" )).thenReturn(audio());
        when(viettel.synthesizeVietnamese("Chưa đúng.")).thenReturn(audio());

        var result = service.getFeedbackAudioUrls("game-1", TEACHER);

        assertThat(result.correctAudioUrl()).contains("shared/feedback/");
        assertThat(result.wrongAudioUrl()).contains("shared/feedback/");
        assertThat(result.correctAudioUrl()).isNotEqualTo(result.wrongAudioUrl());
        assertThat(cache).hasSize(2);
        assertThat(cache.values()).allSatisfy(asset -> {
            assertThat(asset.getLanguage()).isEqualTo("vi");
            assertThat(asset.getProvider()).isEqualTo("viettel-ai");
            assertThat(asset.getByteLength()).isEqualTo(audio().audio().length);
            assertThat(asset.getDurationMillis()).isPositive().isLessThanOrEqualTo(30_000);
        });
        verify(viettel).synthesizeVietnamese("Đúng rồi!");
        verify(viettel).synthesizeVietnamese("Chưa đúng.");
        verify(elevenLabs, never()).synthesizeEnglish(anyString());
    }

    @Test
    void reusesSharedCacheWithoutCallingEitherProviderAgain() {
        Game game = game("game-1", Subject.VIETNAMESE);
        when(games.findByIdAndAuthor_Id("game-1", "teacher-1")).thenReturn(Optional.of(game));
        when(viettel.synthesizeVietnamese("Đúng rồi!")).thenReturn(audio());
        when(viettel.synthesizeVietnamese("Chưa đúng.")).thenReturn(audio());

        var first = service.getFeedbackAudioUrls("game-1", TEACHER);
        var second = service.getFeedbackAudioUrls("game-1", TEACHER);

        assertThat(second.correctAudioUrl()).isEqualTo(first.correctAudioUrl());
        assertThat(second.wrongAudioUrl()).isEqualTo(first.wrongAudioUrl());
        verify(viettel).synthesizeVietnamese("Đúng rồi!");
        verify(viettel).synthesizeVietnamese("Chưa đúng.");
        verify(assets, times(2)).saveAndFlush(any(SharedNarrationAsset.class));
    }

    @Test
    void separatesCacheByLanguageAndProvider() {
        Game vietnameseGame = game("game-vi", Subject.MATH);
        Game englishGame = game("game-en", Subject.ENGLISH);
        when(games.findByIdAndAuthor_Id("game-vi", "teacher-1")).thenReturn(Optional.of(vietnameseGame));
        when(games.findByIdAndAuthor_Id("game-en", "teacher-1")).thenReturn(Optional.of(englishGame));
        when(elevenLabs.voiceId()).thenReturn("english-voice");
        when(elevenLabs.modelId()).thenReturn("english-model");
        when(viettel.synthesizeVietnamese("Đúng rồi!")).thenReturn(audio());
        when(viettel.synthesizeVietnamese("Chưa đúng.")).thenReturn(audio());
        when(elevenLabs.synthesizeEnglish("Correct!")).thenReturn(audio());
        when(elevenLabs.synthesizeEnglish("Not quite.")).thenReturn(audio());

        var vietnamese = service.getFeedbackAudioUrls("game-vi", TEACHER);
        var english = service.getFeedbackAudioUrls("game-en", TEACHER);

        assertThat(english.correctAudioUrl()).isNotEqualTo(vietnamese.correctAudioUrl());
        assertThat(english.wrongAudioUrl()).isNotEqualTo(vietnamese.wrongAudioUrl());
        assertThat(cache.values()).extracting(SharedNarrationAsset::getProvider)
                .containsExactlyInAnyOrder("viettel-ai", "viettel-ai", "elevenlabs", "elevenlabs");
        verify(elevenLabs).synthesizeEnglish("Correct!");
        verify(elevenLabs).synthesizeEnglish("Not quite.");
    }

    @Test
    void hidesGamesNotOwnedByTheAuthenticatedTeacher() {
        when(games.findByIdAndAuthor_Id("game-1", "teacher-1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getFeedbackAudioUrls("game-1", TEACHER))
                .isInstanceOfSatisfying(ApiException.class, error ->
                        assertThat(error.getErrorCode()).isEqualTo(ErrorCode.NOT_FOUND));
        verify(viettel, never()).synthesizeVietnamese(anyString());
        verify(assets, never()).findByCacheKey(anyString());
    }

    @Test
    void rejectsMissingTeacher() {
        assertThatThrownBy(() -> service.getFeedbackAudioUrls("game-1", null))
                .isInstanceOfSatisfying(ApiException.class, error ->
                        assertThat(error.getErrorCode()).isEqualTo(ErrorCode.UNAUTHORIZED));
    }

    @Test
    void rejectsMalformedProviderAudioWithoutSavingOrUploadingIt() {
        when(games.findByIdAndAuthor_Id("game-1", "teacher-1"))
                .thenReturn(Optional.of(game("game-1", Subject.MATH)));
        when(viettel.synthesizeVietnamese("Đúng rồi!")).thenReturn(new SynthesizedAudio(new byte[] {1, 2, 3}, 1));

        assertUnavailable(() -> service.getFeedbackAudioUrls("game-1", TEACHER));
        verify(storage, never()).upload(anyString(), any(byte[].class));
        verify(assets, never()).saveAndFlush(any(SharedNarrationAsset.class));
    }

    @Test
    void reportsStorageFailureWithoutExposingProviderOrStorageDetails() {
        when(games.findByIdAndAuthor_Id("game-1", "teacher-1"))
                .thenReturn(Optional.of(game("game-1", Subject.MATH)));
        when(viettel.synthesizeVietnamese("Đúng rồi!")).thenReturn(audio());
        org.mockito.Mockito.doThrow(new IllegalStateException("service-role-secret-value"))
                .when(storage).upload(anyString(), any(byte[].class));

        assertUnavailable(() -> service.getFeedbackAudioUrls("game-1", TEACHER));
        verify(storage, never()).createSignedUrl(anyString(), org.mockito.ArgumentMatchers.anyInt());
    }

    private static void assertUnavailable(Runnable action) {
        assertThatThrownBy(action::run).isInstanceOfSatisfying(ApiException.class, error -> {
            assertThat(error.getErrorCode()).isEqualTo(ErrorCode.NARRATION_UNAVAILABLE);
            assertThat(error.getMessage()).doesNotContain("service-role-secret-value");
        });
    }

    private static Game game(String id, Subject subject) {
        Game game = new Game();
        game.setId(id);
        game.setSubject(subject);
        return game;
    }

    private static SynthesizedAudio audio() {
        byte[] frame = new byte[104];
        frame[0] = (byte) 0xFF;
        frame[1] = (byte) 0xF3;
        frame[2] = 0x40;
        return new SynthesizedAudio(frame, 0.026);
    }
}
