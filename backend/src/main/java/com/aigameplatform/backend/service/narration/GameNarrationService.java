package com.aigameplatform.backend.service.narration;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.GameNarrationAsset;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.GameNarrationAssetRepository;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class GameNarrationService {
    private static final int MAX_GAME_FILES = 20;
    private static final int MAX_GAME_BYTES = 5 * 1024 * 1024;
    private static final int SIGNED_URL_TTL_SECONDS = 600;
    private static final int STUDENT_PLAY_SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;
    private final GameRepository games;
    private final GameNarrationAssetRepository assets;
    private final ViettelTtsClient tts;
    private final ElevenLabsTtsClient englishTts;
    private final SupabaseNarrationStorage storage;

    public GameNarrationService(GameRepository games, GameNarrationAssetRepository assets,
            ViettelTtsClient tts, ElevenLabsTtsClient englishTts, SupabaseNarrationStorage storage) {
        this.games = games;
        this.assets = assets;
        this.tts = tts;
        this.englishTts = englishTts;
        this.storage = storage;
    }

    @Transactional
    public NarrationPreview generate(String gameId, String questionId, AuthenticatedTeacher teacher) {
        if (teacher == null) throw new ApiException(ErrorCode.UNAUTHORIZED, "Authentication required");
        Game game = games.findByIdAndAuthor_IdForUpdate(gameId, teacher.teacherId())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Game not found"));
        int index = questionIndex(questionId, game.getQuestions().size());
        QuestionGame question = game.getQuestions().get(index);
        String text = question.getAudioText();
        if (text == null || text.isBlank())
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "This question has no narration text");
        if (hasSourceAudio(question.getAudioUrl()))
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "This question already uses source audio");
        String normalizedText = Normalizer.normalize(text.trim(), Normalizer.Form.NFC);
        if (normalizedText.codePointCount(0, normalizedText.length()) > ViettelTtsClient.MAX_TEXT_CODEPOINTS)
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Narration text exceeds 300 Unicode characters");

        boolean english = game.getSubject() == Subject.ENGLISH;
        String provider = english ? "elevenlabs" : "viettel-ai";
        String voice = english ? englishTts.voiceId() : ViettelTtsClient.DEFAULT_VOICE;
        String model = english ? englishTts.modelId() : "viettel-default";
        String fingerprint = fingerprint(text, provider, voice, model);
        GameNarrationAsset current = assets.findByGame_IdAndQuestion_Id(gameId, question.getId()).orElse(null);
        if (current != null && current.getContentSha256().equals(fingerprint)) return signed(current, questionId);

        List<GameNarrationAsset> existing = assets.findAllByGame_Id(gameId);
        if (current == null && existing.size() >= MAX_GAME_FILES)
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "A game can contain at most 20 narration files");

        SynthesizedAudio synthesized;
        try {
            synthesized = english ? englishTts.synthesizeEnglish(text) : tts.synthesizeVietnamese(text);
        } catch (RuntimeException failure) {
            throw narrationUnavailable(failure);
        }
        int currentBytes = existing.stream().mapToInt(GameNarrationAsset::getByteLength).sum();
        if (currentBytes - (current == null ? 0 : current.getByteLength()) + synthesized.audio().length > MAX_GAME_BYTES)
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Game narration exceeds 5 MiB");

        String path = gameId + "/" + question.getId() + "/" + fingerprint + ".mp3";
        try {
            storage.upload(path, synthesized.audio());
        } catch (RuntimeException failure) {
            throw narrationUnavailable(failure);
        }
        String previousPath = current == null ? null : current.getStoragePath();
        try {
            GameNarrationAsset asset = current == null ? new GameNarrationAsset() : current;
            asset.setGame(game);
            asset.setQuestion(question);
            asset.setContentSha256(fingerprint);
            asset.setStoragePath(path);
            asset.setByteLength(synthesized.audio().length);
            asset.setDurationMillis((int) Math.ceil(synthesized.durationSeconds() * 1000));
            asset = assets.saveAndFlush(asset);
            if (previousPath != null && !previousPath.equals(path)) scheduleOldObjectCleanup(previousPath);
            String audioUrl;
            try {
                audioUrl = storage.createSignedUrl(asset.getStoragePath(), 600);
            } catch (RuntimeException failure) {
                throw narrationUnavailable(failure);
            }
            return new NarrationPreview(questionId, audioUrl,
                    asset.getByteLength(), asset.getDurationMillis());
        } catch (RuntimeException failure) {
            try {
                storage.delete(List.of(path));
            } catch (RuntimeException ignored) {
                // Keep the original failure. A later storage reconciliation can remove an orphan object.
            }
            throw failure;
        }
    }

    @Transactional(readOnly = true)
    public Map<String, String> signedUrls(String gameId) {
        return signedUrls(gameId, SIGNED_URL_TTL_SECONDS);
    }

    @Transactional(readOnly = true)
    public Map<String, String> signedUrlsForStudentPlay(String gameId) {
        return signedUrls(gameId, STUDENT_PLAY_SIGNED_URL_TTL_SECONDS);
    }

    private Map<String, String> signedUrls(String gameId, int expiresInSeconds) {
        Map<String, String> result = new LinkedHashMap<>();
        for (GameNarrationAsset asset : assets.findAllByGame_Id(gameId)) {
            String audioText = asset.getQuestion().getAudioText();
            if (audioText == null || audioText.isBlank()
                    || !asset.getContentSha256().equals(fingerprint(asset.getGame(), audioText))) continue;
            try {
                result.put("q" + (asset.getQuestion().getItemIndex() + 1), storage.createSignedUrl(
                        asset.getStoragePath(), expiresInSeconds));
            } catch (RuntimeException ignored) {
                // Audio is optional. A signing or Storage outage must leave the question playable.
            }
        }
        return result;
    }

    private NarrationPreview signed(GameNarrationAsset asset, String questionId) {
        try {
            return new NarrationPreview(questionId, storage.createSignedUrl(asset.getStoragePath(), 600),
                    asset.getByteLength(), asset.getDurationMillis());
        } catch (RuntimeException failure) {
            throw narrationUnavailable(failure);
        }
    }

    private void scheduleOldObjectCleanup(String path) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    storage.delete(List.of(path));
                } catch (RuntimeException ignored) {
                    // Old unreferenced assets are safe to retry-clean without affecting the saved narration.
                }
            }
        });
    }

    private static ApiException narrationUnavailable(RuntimeException cause) {
        return new ApiException(ErrorCode.NARRATION_UNAVAILABLE,
                "Chưa tạo hoặc tải được bản đọc lúc này. Hãy thử lại sau.", cause);
    }

    public static boolean isMockAudioUrl(String audioUrl) {
        return audioUrl != null && audioUrl.startsWith("/mock/");
    }

    private static boolean hasSourceAudio(String audioUrl) {
        return audioUrl != null && !audioUrl.isBlank() && !isMockAudioUrl(audioUrl);
    }

    private static int questionIndex(String id, int questionCount) {
        if (id == null || !id.matches("q[1-9][0-9]{0,2}"))
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Question ID is invalid");
        int index;
        try {
            index = Integer.parseInt(id.substring(1)) - 1;
        } catch (NumberFormatException invalid) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Question ID is invalid");
        }
        if (index < 0 || index >= questionCount) throw new ApiException(ErrorCode.NOT_FOUND, "Question not found");
        return index;
    }

    private String fingerprint(Game game, String sourceText) {
        boolean english = game.getSubject() == Subject.ENGLISH;
        return fingerprint(sourceText, english ? "elevenlabs" : "viettel-ai",
                english ? englishTts.voiceId() : ViettelTtsClient.DEFAULT_VOICE,
                english ? englishTts.modelId() : "viettel-default");
    }

    private static String fingerprint(String sourceText, String provider, String voice, String model) {
        try {
            String text = Normalizer.normalize(sourceText.trim(), Normalizer.Form.NFC);
            String content = "provider=" + provider + "\nvoice=" + voice + "\nmodel=" + model
                    + "\nMP3\n1.0\nfalse\n" + text;
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(content.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    public record NarrationPreview(String questionId, String audioUrl, int bytes, int durationMillis) { }
}
