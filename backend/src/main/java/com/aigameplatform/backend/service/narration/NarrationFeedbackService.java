package com.aigameplatform.backend.service.narration;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.SharedNarrationAsset;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.SharedNarrationAssetRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.UUID;
import java.util.HexFormat;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.dao.DataIntegrityViolationException;

@Service
public class NarrationFeedbackService {
    private static final String DEFAULT_PHRASE_VERSION = "1";
    private static final String VIETNAMESE_PROVIDER = "viettel-ai";
    private static final String ENGLISH_PROVIDER = "elevenlabs";

    private final GameRepository games;
    private final SharedNarrationAssetRepository assets;
    private final ViettelTtsClient viettel;
    private final ElevenLabsTtsClient elevenLabs;
    private final SupabaseNarrationStorage storage;
    private final String phraseVersion;

    public NarrationFeedbackService(GameRepository games, SharedNarrationAssetRepository assets,
            ViettelTtsClient viettel, ElevenLabsTtsClient elevenLabs, SupabaseNarrationStorage storage,
            @Value("${app.narration.feedback-cache-version:" + DEFAULT_PHRASE_VERSION + "}") String phraseVersion) {
        this.games = games;
        this.assets = assets;
        this.viettel = viettel;
        this.elevenLabs = elevenLabs;
        this.storage = storage;
        this.phraseVersion = phraseVersion == null || phraseVersion.isBlank()
                ? DEFAULT_PHRASE_VERSION : phraseVersion.trim();
    }

    public FeedbackAudioUrls getFeedbackAudioUrls(String gameId, AuthenticatedTeacher teacher) {
        if (teacher == null) throw new ApiException(ErrorCode.UNAUTHORIZED, "Authentication required");
        Game game = games.findByIdAndAuthor_Id(gameId, teacher.teacherId())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Game not found"));

        boolean english = game.getSubject() == Subject.ENGLISH;
        String language = english ? "en" : "vi";
        String provider = english ? ENGLISH_PROVIDER : VIETNAMESE_PROVIDER;
        String voice = english ? elevenLabs.voiceId() : ViettelTtsClient.DEFAULT_VOICE;
        String model = english ? elevenLabs.modelId() : "viettel-default";
        try {
            String correct = getOrCreate(language, provider, voice, model, "correct",
                    english ? "Correct!" : "Đúng rồi!", english);
            String wrong = getOrCreate(language, provider, voice, model, "wrong",
                    english ? "Not quite." : "Chưa đúng.", english);
            return new FeedbackAudioUrls(correct, wrong);
        } catch (RuntimeException failure) {
            if (failure instanceof ApiException apiException
                    && apiException.getErrorCode() == ErrorCode.NARRATION_UNAVAILABLE) throw apiException;
            throw narrationUnavailable(failure);
        }
    }

    private String getOrCreate(String language, String provider, String voice, String model,
            String phraseKey, String phrase, boolean english) {
        String cacheKey = cacheKey(language, provider, voice, model, phraseKey, phraseVersion, phrase);
        SharedNarrationAsset cached = assets.findByCacheKey(cacheKey).orElse(null);
        if (cached != null) return sign(cached.getStoragePath());

        SynthesizedAudio synthesized = english
                ? elevenLabs.synthesizeEnglish(phrase)
                : viettel.synthesizeVietnamese(phrase);
        String path = "shared/feedback/" + cacheKey + "/" + UUID.randomUUID() + ".mp3";
        SharedNarrationAsset asset = new SharedNarrationAsset();
        asset.setCacheKey(cacheKey);
        asset.setLanguage(language);
        asset.setProvider(provider);
        asset.setVoiceId(voice);
        asset.setModelId(model);
        asset.setPhraseKey(phraseKey);
        asset.setPhraseVersion(phraseVersion);
        asset.setStoragePath(path);
        asset.setByteLength(synthesized.audio().length);
        asset.setDurationMillis((int) Math.ceil(synthesized.durationSeconds() * 1000));
        try {
            storage.upload(path, synthesized.audio());
            asset = assets.saveAndFlush(asset);
        } catch (DataIntegrityViolationException conflict) {
            cleanupNewObjects(List.of(path));
            asset = assets.findByCacheKey(cacheKey).orElseThrow(() -> conflict);
        } catch (RuntimeException failure) {
            cleanupNewObjects(List.of(path));
            throw failure;
        }
        return sign(asset.getStoragePath());
    }

    private String sign(String path) {
        return storage.createSignedUrl(path, 600);
    }

    private void cleanupNewObjects(List<String> paths) {
        if (paths.isEmpty()) return;
        try {
            storage.delete(List.copyOf(paths));
        } catch (RuntimeException ignored) {
            // A failed request must not replace the useful error with a cleanup failure.
        }
    }

    private static String cacheKey(String language, String provider, String voice, String model,
            String phraseKey, String version, String phrase) {
        String input = "language=" + language + "\nprovider=" + provider + "\nvoice=" + voice
                + "\nmodel=" + model + "\nphraseKey=" + phraseKey + "\nphraseVersion=" + version
                + "\nformat=MP3\n" + phrase;
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private static ApiException narrationUnavailable(RuntimeException cause) {
        return new ApiException(ErrorCode.NARRATION_UNAVAILABLE,
                "Không tạo hoặc tải được lời đọc lúc này. Hãy thử lại sau.", cause);
    }

    public record FeedbackAudioUrls(String correctAudioUrl, String wrongAudioUrl) { }
}
