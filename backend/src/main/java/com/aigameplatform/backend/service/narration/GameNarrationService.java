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
import java.util.function.Function;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionOperations;
import java.util.UUID;

@Service
public class GameNarrationService {
    private static final int MAX_GAME_FILES = 20;
    private static final int MAX_GAME_BYTES = 5 * 1024 * 1024;
    private static final int SIGNED_URL_TTL_SECONDS = 600;
    private final GameRepository games;
    private final GameNarrationAssetRepository assets;
    private final ViettelTtsClient tts;
    private final ElevenLabsTtsClient englishTts;
    private final SupabaseNarrationStorage storage;

    private final TransactionOperations transactions;

    public GameNarrationService(GameRepository games, GameNarrationAssetRepository assets,
            ViettelTtsClient tts, ElevenLabsTtsClient englishTts, SupabaseNarrationStorage storage, TransactionOperations transactions) {
        this.transactions = transactions;
        this.games = games;
        this.assets = assets;
        this.tts = tts;
        this.englishTts = englishTts;
        this.storage = storage;
    }

    public NarrationPreview generate(String gameId, String questionId, AuthenticatedTeacher teacher) {
        if (teacher == null) throw new ApiException(ErrorCode.UNAUTHORIZED, "Authentication required");
        State initial = transactions.execute(status -> load(gameId, questionId, teacher));
        if (initial.cached()) return signed(initial.current(), questionId);
        SynthesizedAudio audio;
        try {
            audio = initial.english() ? englishTts.synthesizeEnglish(initial.text())
                    : tts.synthesizeVietnamese(initial.text());
        } catch (RuntimeException failure) {
            throw narrationUnavailable(failure);
        }
        initial.checkSize(audio.audio().length);
        String path = gameId + "/" + initial.question().getId() + "/" + UUID.randomUUID() + ".mp3";
        try {
            storage.upload(path, audio.audio());
        } catch (RuntimeException failure) {
            cleanup(path);
            throw narrationUnavailable(failure);
        }
        Saved saved;
        try {
            saved = transactions.execute(status -> {
                State latest = load(gameId, questionId, teacher);
                if (!latest.question().getId().equals(initial.question().getId())
                        || !latest.fingerprint().equals(initial.fingerprint()))
                    throw new ApiException(ErrorCode.CONFLICT, "Question changed during narration generation");
                if (latest.cached()) return new Saved(latest.current(), path);
                latest.checkSize(audio.audio().length);
                GameNarrationAsset asset = latest.current() == null ? new GameNarrationAsset() : latest.current();
                String previousPath = asset.getStoragePath();
                asset.setGame(latest.game());
                asset.setQuestion(latest.question());
                asset.setContentSha256(latest.fingerprint());
                asset.setStoragePath(path);
                asset.setByteLength(audio.audio().length);
                asset.setDurationMillis((int) Math.ceil(audio.durationSeconds() * 1000));
                return new Saved(assets.saveAndFlush(asset), previousPath);
            });
        } catch (RuntimeException failure) {
            cleanup(path);
            throw failure;
        }
        if (saved.unusedPath() != null) cleanup(saved.unusedPath());
        return signed(saved.asset(), questionId);
    }

    private record Saved(GameNarrationAsset asset, String unusedPath) { }

    private record State(Game game, QuestionGame question, String text, boolean english,
            String fingerprint, GameNarrationAsset current, int otherBytes) {
        boolean cached() {
            return current != null && fingerprint.equals(current.getContentSha256());
        }

        void checkSize(int bytes) {
            if (otherBytes + bytes > MAX_GAME_BYTES)
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "Game narration exceeds 5 MiB");
        }
    }

    private State load(String gameId, String questionId, AuthenticatedTeacher teacher) {
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
        String fingerprint = fingerprint(game, text);
        GameNarrationAsset current = assets.findByGame_IdAndQuestion_Id(gameId, question.getId()).orElse(null);
        List<GameNarrationAsset> existing = assets.findAllByGame_Id(gameId);
        if (current == null && existing.size() >= MAX_GAME_FILES)
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "A game can contain at most 20 narration files");
        int bytes = existing.stream().mapToInt(GameNarrationAsset::getByteLength).sum();
        return new State(game, question, text, english, fingerprint, current,
                bytes - (current == null ? 0 : current.getByteLength()));
    }

    @Transactional(readOnly = true)
    public Map<String, String> signedUrls(String gameId) {
        return signedUrls(gameId, path -> storage.createSignedUrl(path, SIGNED_URL_TTL_SECONDS));
    }

    @Transactional(readOnly = true)
    public Map<String, String> signedUrlsForStudentPlay(String gameId) {
        return signedUrls(gameId, storage::createStudentPlaySignedUrl);
    }

    private Map<String, String> signedUrls(String gameId, Function<String, String> sign) {
        Map<String, String> result = new LinkedHashMap<>();
        for (GameNarrationAsset asset : assets.findAllByGame_Id(gameId)) {
            String audioText = asset.getQuestion().getAudioText();
            if (audioText == null || audioText.isBlank()
                    || !asset.getContentSha256().equals(fingerprint(asset.getGame(), audioText))) continue;
            try {
                result.put("q" + (asset.getQuestion().getItemIndex() + 1), sign.apply(asset.getStoragePath()));
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

    private void cleanup(String path) {
        try {
            storage.delete(List.of(path));
        } catch (RuntimeException ignored) {
            // A later storage reconciliation can remove an unreferenced upload.
        }
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
