package com.aigameplatform.backend.service.narration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.GameNarrationAsset;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.question.QuizQuestion;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.GameNarrationAssetRepository;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class GameNarrationServiceTest {
    @Test
    void generatesFromStoredAudioTextAndPersistsTheAssetByQuestion() {
        GameRepository games = mock(GameRepository.class);
        GameNarrationAssetRepository assets = mock(GameNarrationAssetRepository.class);
        ViettelTtsClient tts = mock(ViettelTtsClient.class);
        SupabaseNarrationStorage storage = mock(SupabaseNarrationStorage.class);
        Game game = gameWithAudioText("Chào các em");
        QuizQuestion question = (QuizQuestion) game.getQuestions().getFirst();
        question.setAudioUrl("/mock/q1.wav");
        when(games.findByIdAndAuthor_IdForUpdate("game-1", "teacher-1")).thenReturn(Optional.of(game));
        when(assets.findByGame_IdAndQuestion_Id("game-1", question.getId())).thenReturn(Optional.empty());
        when(assets.findAllByGame_Id("game-1")).thenReturn(List.of());
        when(tts.synthesizeVietnamese("Chào các em"))
                .thenReturn(new SynthesizedAudio(new byte[] {1, 2, 3}, 1.2));
        when(storage.createSignedUrl(any(String.class), org.mockito.ArgumentMatchers.eq(600)))
                .thenReturn("https://storage.test/audio");
        when(assets.saveAndFlush(any(GameNarrationAsset.class))).thenAnswer(call -> call.getArgument(0));

        var result = new GameNarrationService(games, assets, tts, mock(ElevenLabsTtsClient.class), storage)
                .generate("game-1", "q1", new AuthenticatedTeacher("teacher-1", "teacher@test", "session"));

        assertThat(result.audioUrl()).isEqualTo("https://storage.test/audio");
        assertThat(result.bytes()).isEqualTo(3);
        verify(storage).upload(any(String.class), any(byte[].class));
        verify(assets).saveAndFlush(any(GameNarrationAsset.class));
    }

    @Test
    void stillRejectsRealTeacherSuppliedSourceAudio() {
        GameRepository games = mock(GameRepository.class);
        Game game = gameWithAudioText("ChÃ o cÃ¡c em");
        QuizQuestion question = (QuizQuestion) game.getQuestions().getFirst();
        question.setAudioUrl("https://storage.example/teacher-recording.mp3");
        when(games.findByIdAndAuthor_IdForUpdate("game-1", "teacher-1")).thenReturn(Optional.of(game));

        assertThatThrownBy(() -> new GameNarrationService(games, mock(GameNarrationAssetRepository.class),
                mock(ViettelTtsClient.class), mock(ElevenLabsTtsClient.class), mock(SupabaseNarrationStorage.class))
                .generate("game-1", "q1", new AuthenticatedTeacher("teacher-1", "teacher@test", "session")))
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    assertThat(error.getMessage()).contains("already uses source audio");
                });
    }

    @Test
    void enforcesTwentyFilesBeforeCallingViettel() {
        GameRepository games = mock(GameRepository.class);
        GameNarrationAssetRepository assets = mock(GameNarrationAssetRepository.class);
        ViettelTtsClient tts = mock(ViettelTtsClient.class);
        Game game = gameWithAudioText("Chào các em");
        when(games.findByIdAndAuthor_IdForUpdate("game-1", "teacher-1")).thenReturn(Optional.of(game));
        when(assets.findByGame_IdAndQuestion_Id("game-1", game.getQuestions().getFirst().getId()))
                .thenReturn(Optional.empty());
        when(assets.findAllByGame_Id("game-1")).thenReturn(java.util.stream.IntStream.range(0, 20)
                .mapToObj(ignored -> mock(GameNarrationAsset.class)).toList());

        assertThatThrownBy(() -> new GameNarrationService(games, assets, tts, mock(ElevenLabsTtsClient.class),
                mock(SupabaseNarrationStorage.class))
                .generate("game-1", "q1", new AuthenticatedTeacher("teacher-1", "teacher@test", "session")))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("20");
        verify(tts, never()).synthesizeVietnamese(any(String.class));
    }

    @Test
    void rejectsTextOverThreeHundredUnicodeCharactersBeforeCallingProvider() {
        GameRepository games = mock(GameRepository.class);
        GameNarrationAssetRepository assets = mock(GameNarrationAssetRepository.class);
        ViettelTtsClient tts = mock(ViettelTtsClient.class);
        Game game = gameWithAudioText("a".repeat(301));
        when(games.findByIdAndAuthor_IdForUpdate("game-1", "teacher-1")).thenReturn(Optional.of(game));

        assertThatThrownBy(() -> new GameNarrationService(games, assets, tts, mock(ElevenLabsTtsClient.class),
                mock(SupabaseNarrationStorage.class))
                .generate("game-1", "q1", new AuthenticatedTeacher("teacher-1", "teacher@test", "session")))
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR);
                    assertThat(error.getMessage()).contains("300 Unicode characters");
                });
        verify(tts, never()).synthesizeVietnamese(any(String.class));
    }

    @Test
    void returnsRecoverableServiceErrorWhenViettelTtsFails() {
        GameRepository games = mock(GameRepository.class);
        GameNarrationAssetRepository assets = mock(GameNarrationAssetRepository.class);
        ViettelTtsClient tts = mock(ViettelTtsClient.class);
        Game game = gameWithAudioText("Read this prompt");
        QuizQuestion question = (QuizQuestion) game.getQuestions().getFirst();
        when(games.findByIdAndAuthor_IdForUpdate("game-1", "teacher-1")).thenReturn(Optional.of(game));
        when(assets.findByGame_IdAndQuestion_Id("game-1", question.getId())).thenReturn(Optional.empty());
        when(assets.findAllByGame_Id("game-1")).thenReturn(List.of());
        when(tts.synthesizeVietnamese("Read this prompt")).thenThrow(new IllegalStateException("private provider detail"));

        assertThatThrownBy(() -> new GameNarrationService(games, assets, tts, mock(ElevenLabsTtsClient.class),
                mock(SupabaseNarrationStorage.class))
                .generate("game-1", "q1", new AuthenticatedTeacher("teacher-1", "teacher@test", "session")))
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.getErrorCode()).isEqualTo(ErrorCode.NARRATION_UNAVAILABLE);
                    assertThat(error.getMessage()).doesNotContain("private provider detail");
                });
        verify(assets, never()).saveAndFlush(any(GameNarrationAsset.class));
    }

    @Test
    void returnsRecoverableServiceErrorWhenStorageUploadFails() {
        GameRepository games = mock(GameRepository.class);
        GameNarrationAssetRepository assets = mock(GameNarrationAssetRepository.class);
        ViettelTtsClient tts = mock(ViettelTtsClient.class);
        SupabaseNarrationStorage storage = mock(SupabaseNarrationStorage.class);
        Game game = gameWithAudioText("Read this prompt");
        QuizQuestion question = (QuizQuestion) game.getQuestions().getFirst();
        when(games.findByIdAndAuthor_IdForUpdate("game-1", "teacher-1")).thenReturn(Optional.of(game));
        when(assets.findByGame_IdAndQuestion_Id("game-1", question.getId())).thenReturn(Optional.empty());
        when(assets.findAllByGame_Id("game-1")).thenReturn(List.of());
        when(tts.synthesizeVietnamese("Read this prompt"))
                .thenReturn(new SynthesizedAudio(new byte[] {1, 2, 3}, 1.2));
        org.mockito.Mockito.doThrow(new IllegalStateException("private storage detail"))
                .when(storage).upload(any(String.class), any(byte[].class));

        assertThatThrownBy(() -> new GameNarrationService(games, assets, tts, mock(ElevenLabsTtsClient.class), storage)
                .generate("game-1", "q1", new AuthenticatedTeacher("teacher-1", "teacher@test", "session")))
                .isInstanceOfSatisfying(ApiException.class, error -> {
                    assertThat(error.getErrorCode()).isEqualTo(ErrorCode.NARRATION_UNAVAILABLE);
                    assertThat(error.getMessage()).doesNotContain("private storage detail");
                });
        verify(assets, never()).saveAndFlush(any(GameNarrationAsset.class));
    }

    @Test
    void reusesAStoredAssetWhenTheTextAndVoiceFingerprintMatch() {
        GameRepository games = mock(GameRepository.class);
        GameNarrationAssetRepository assets = mock(GameNarrationAssetRepository.class);
        ViettelTtsClient tts = mock(ViettelTtsClient.class);
        SupabaseNarrationStorage storage = mock(SupabaseNarrationStorage.class);
        Game game = gameWithAudioText("Chào các em");
        QuizQuestion question = (QuizQuestion) game.getQuestions().getFirst();
        GameNarrationAsset existing = new GameNarrationAsset();
        existing.setGame(game);
        existing.setQuestion(question);
        existing.setContentSha256(fingerprint("Chào các em"));
        existing.setStoragePath("game-1/question-1/audio.mp3");
        existing.setByteLength(1200);
        existing.setDurationMillis(1400);
        when(games.findByIdAndAuthor_IdForUpdate("game-1", "teacher-1")).thenReturn(Optional.of(game));
        when(assets.findByGame_IdAndQuestion_Id("game-1", question.getId())).thenReturn(Optional.of(existing));
        when(storage.createSignedUrl(existing.getStoragePath(), 600)).thenReturn("https://storage.test/cached");

        var result = new GameNarrationService(games, assets, tts, mock(ElevenLabsTtsClient.class), storage)
                .generate("game-1", "q1", new AuthenticatedTeacher("teacher-1", "teacher@test", "session"));

        assertThat(result.audioUrl()).isEqualTo("https://storage.test/cached");
        assertThat(result.bytes()).isEqualTo(1200);
        verify(tts, never()).synthesizeVietnamese(any(String.class));
    }

    @Test
    void doesNotServeAnAssetAfterItsStoredNarrationTextChanges() {
        Game game = gameWithAudioText("Updated prompt");
        QuizQuestion question = (QuizQuestion) game.getQuestions().getFirst();
        GameNarrationAsset stale = new GameNarrationAsset();
        stale.setGame(game);
        stale.setQuestion(question);
        stale.setContentSha256(fingerprint("Old prompt"));
        stale.setStoragePath("game-1/question-1/old.mp3");
        GameNarrationAssetRepository assets = mock(GameNarrationAssetRepository.class);
        SupabaseNarrationStorage storage = mock(SupabaseNarrationStorage.class);
        when(assets.findAllByGame_Id("game-1")).thenReturn(List.of(stale));

        assertThat(new GameNarrationService(mock(GameRepository.class), assets,
                mock(ViettelTtsClient.class), mock(ElevenLabsTtsClient.class), storage).signedUrls("game-1")).isEmpty();
        verify(storage, never()).createSignedUrl(any(String.class), org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void usesEnglishProviderAndDoesNotReuseLegacyVietnameseFingerprintForEnglishGame() {
        GameRepository games = mock(GameRepository.class);
        GameNarrationAssetRepository assets = mock(GameNarrationAssetRepository.class);
        ViettelTtsClient viettel = mock(ViettelTtsClient.class);
        ElevenLabsTtsClient elevenLabs = mock(ElevenLabsTtsClient.class);
        SupabaseNarrationStorage storage = mock(SupabaseNarrationStorage.class);
        Game game = gameWithAudioText("Count the stars.");
        game.setSubject(Subject.ENGLISH);
        QuizQuestion question = (QuizQuestion) game.getQuestions().getFirst();
        GameNarrationAsset legacyVietnameseAsset = new GameNarrationAsset();
        legacyVietnameseAsset.setGame(game);
        legacyVietnameseAsset.setQuestion(question);
        legacyVietnameseAsset.setContentSha256(fingerprint("Count the stars."));
        legacyVietnameseAsset.setStoragePath("game-1/question-1/legacy.mp3");
        legacyVietnameseAsset.setByteLength(100);
        legacyVietnameseAsset.setDurationMillis(900);
        when(games.findByIdAndAuthor_IdForUpdate("game-1", "teacher-1")).thenReturn(Optional.of(game));
        when(assets.findByGame_IdAndQuestion_Id("game-1", question.getId()))
                .thenReturn(Optional.of(legacyVietnameseAsset));
        when(assets.findAllByGame_Id("game-1")).thenReturn(List.of(legacyVietnameseAsset));
        when(elevenLabs.synthesizeEnglish("Count the stars."))
                .thenReturn(new SynthesizedAudio(new byte[] {4, 5, 6}, 1.1));
        when(storage.createSignedUrl(any(String.class), org.mockito.ArgumentMatchers.eq(600)))
                .thenReturn("https://storage.test/english-audio");
        when(assets.saveAndFlush(any(GameNarrationAsset.class))).thenAnswer(call -> call.getArgument(0));

        var result = new GameNarrationService(games, assets, viettel, elevenLabs, storage)
                .generate("game-1", "q1", new AuthenticatedTeacher("teacher-1", "teacher@test", "session"));

        assertThat(result.audioUrl()).isEqualTo("https://storage.test/english-audio");
        verify(elevenLabs).synthesizeEnglish("Count the stars.");
        verify(viettel, never()).synthesizeVietnamese(any(String.class));
        verify(storage).upload(any(String.class), org.mockito.ArgumentMatchers.argThat(bytes ->
                java.util.Arrays.equals(bytes, new byte[] {4, 5, 6})));
    }

    private static Game gameWithAudioText(String text) {
        Game game = new Game();
        game.setId("game-1");
        game.setSubject(Subject.MATH);
        List<com.aigameplatform.backend.entity.question.QuestionGame> questions = new ArrayList<>();
        QuizQuestion question = new QuizQuestion();
        question.setId("question-1");
        question.setItemIndex(0);
        question.setAudioText(text);
        questions.add(question);
        game.setQuestions(questions);
        return game;
    }

    private static String fingerprint(String text) {
        String content = "provider=viettel-ai\nvoice=" + ViettelTtsClient.DEFAULT_VOICE
                + "\nmodel=viettel-default\nMP3\n1.0\nfalse\n" + text;
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(content.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new AssertionError("SHA-256 must be available", exception);
        }
    }
}
