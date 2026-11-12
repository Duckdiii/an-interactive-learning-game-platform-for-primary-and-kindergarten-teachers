package com.aigameplatform.backend.service;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.dto.response.GameResponse;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.media.SceneImageLoader;
import com.aigameplatform.backend.service.media.InvalidSceneImageException;
import com.aigameplatform.backend.service.media.SceneImageUnavailableException;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.validation.GameValidationService;
import com.aigameplatform.backend.service.validation.ValidationReport;
import com.aigameplatform.backend.service.curriculum.review.GameCurriculumReviewService;
import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence;
import com.aigameplatform.backend.service.generation.GeneratedContentReviewer;
import com.aigameplatform.backend.exception.GeneratedContentUnverifiedException;
import com.aigameplatform.backend.exception.CurriculumEvidenceNotFoundException;
import com.aigameplatform.backend.exception.AiGenerationTimeoutException;
import java.net.URI;
import java.security.SecureRandom;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
public class GamePublicationService {
    private static final char[] CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".toCharArray();
    private static final int MAX_OPTION_IMAGES = 32;
    private static final long MAX_OPTION_IMAGE_BYTES = 32L * 1024 * 1024;
    private final GameRepository games;
    private final GameValidationService validation;
    private final GameContentStrategyRegistry strategies;
    private final SceneImageLoader imageLoader;
    private final GameCurriculumReviewService curriculumReviews;
    private final ObjectProvider<GeneratedContentReviewer> reviewerProvider;
    private final boolean curriculumRagEnabled;
    private final JsonMapper mapper;
    private final String browserOrigin;
    private final SecureRandom random = new SecureRandom();
    private final String shareBaseUrl;

    public GamePublicationService(GameRepository games, GameValidationService validation,
            GameContentStrategyRegistry strategies, SceneImageLoader imageLoader,
            GameCurriculumReviewService curriculumReviews, ObjectProvider<GeneratedContentReviewer> reviewerProvider,
            JsonMapper mapper, @Value("${app.curriculum-rag.enabled:false}") boolean curriculumRagEnabled,
            @Value("${app.player.browser-origin:http://localhost:5173}") String browserOrigin,
            @Value("${app.player.share-base-url:http://localhost:5173/play}") String shareBaseUrl) {
        this.games = games;
        this.validation = validation;
        this.strategies = strategies;
        this.imageLoader = imageLoader;
        this.curriculumReviews = curriculumReviews;
        this.reviewerProvider = reviewerProvider;
        this.curriculumRagEnabled = curriculumRagEnabled;
        this.mapper = mapper;
        this.browserOrigin = browserOrigin;
        this.shareBaseUrl = shareBaseUrl.replaceAll("/+$", "");
    }

    @Transactional(readOnly = true)
    public tools.jackson.databind.node.ObjectNode getGame(String gameId, AuthenticatedTeacher principal) {
        if (principal == null) throw new ApiException(ErrorCode.UNAUTHORIZED, "Authentication required");
        Game game = games.findByIdAndAuthor_Id(gameId, principal.teacherId())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Game not found"));
        return GameResponse.from(game, strategies, mapper);
    }

    @Transactional
    public tools.jackson.databind.node.ObjectNode saveDraft(String gameId, JsonNode body, AuthenticatedTeacher principal) {
        if (principal == null) throw new ApiException(ErrorCode.UNAUTHORIZED, "Authentication required");
        Game game = games.findByIdAndAuthor_Id(gameId, principal.teacherId())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Game not found"));
        if (game.getStatus() != GameStatus.DRAFT)
            throw new ApiException(ErrorCode.CONFLICT, "Only DRAFT games can be edited in this task");
        if (body == null || !body.isObject())
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Game DSL must be an object");
        boolean edited = !body.equals(mapper.valueToTree(strategies.get(game.getGameType()).toGameDsl(game)));
        ValidationReport report = validation.validate(body);
        if (!report.valid()) throw new ApiException(ErrorCode.VALIDATION_ERROR,
                report.errors().stream().map(e -> e.path() + " " + e.message()).findFirst().orElse("Invalid game DSL"));
        GameDsl dsl = report.game();
        if (dsl.gameType() != game.getGameType())
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "gameType cannot change during edit");
        if (dsl instanceof com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl visual) {
            game.setVisualClozeMode(visual.effectiveMode() == VisualClozeMode.IMAGE ? VisualClozeMode.IMAGE : null);
        }
        if (dsl instanceof com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl odd)
            game.setOddOneOutMode(odd.effectiveMode() == com.aigameplatform.backend.entity.enums.OddOneOutMode.IMAGE
                    ? com.aigameplatform.backend.entity.enums.OddOneOutMode.IMAGE : null);
        game.setTitle(dsl.metadata().title());
        game.setTopic(dsl.metadata().topic());
        game.setSubject(dsl.metadata().subject());
        game.setGrade(dsl.metadata().gradeLevel());
        game.setSchemaVersion(dsl.schemaVersion());
        game.setQuestionNum(dsl.questions().size());
        var replacementQuestions = strategies.get(dsl.gameType()).parseToQuestions(dsl);
        game.getQuestions().clear();
        game.getQuestions().addAll(replacementQuestions);
        Game saved = edited ? curriculumReviews.saveEditedGame(game, principal.teacherId()) : games.saveAndFlush(game);
        return GameResponse.withEnvelope(saved, dsl, mapper);
    }

    @Transactional
    public Map<String, Object> publish(String gameId, JsonNode body, AuthenticatedTeacher principal) {
        if (principal == null) throw new ApiException(ErrorCode.UNAUTHORIZED, "Authentication required");
        Game game = games.findByIdAndAuthor_Id(gameId, principal.teacherId())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Game not found"));
        if (game.getStatus() == GameStatus.PUBLISHED) return publishResult(game);
        JsonNode candidate = body == null
                ? mapper.valueToTree(strategies.get(game.getGameType()).toGameDsl(game))
                : body;
        boolean edited = body != null && !body.equals(mapper.valueToTree(strategies.get(game.getGameType()).toGameDsl(game)));
        if (!candidate.isObject()) throw new ApiException(ErrorCode.VALIDATION_ERROR, "Game DSL must be an object");
        ValidationReport report = validation.validate(candidate);
        if (!report.valid()) throw new ApiException(ErrorCode.VALIDATION_ERROR,
                report.errors().stream().map(e -> e.path() + " " + e.message()).findFirst().orElse("Invalid game DSL"));
        GameDsl dsl = report.game();
        if (dsl.gameType() != game.getGameType()) throw new ApiException(ErrorCode.VALIDATION_ERROR,
                "gameType cannot change during publish");
        if (dsl instanceof com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl odd
                && odd.effectiveMode() == com.aigameplatform.backend.entity.enums.OddOneOutMode.IMAGE)
            verifyContentForPublish(odd, gameId, principal.teacherId(), null, Map.of());
        if (dsl instanceof com.aigameplatform.backend.dto.dsl.AudioVisualMatchGameDsl audioVisual) {
            validateAudioVisualImages(audioVisual);
            verifyContentForPublish(audioVisual, gameId, principal.teacherId(), null, Map.of());
        }
        if (dsl instanceof com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl odd)
            game.setOddOneOutMode(odd.effectiveMode() == com.aigameplatform.backend.entity.enums.OddOneOutMode.IMAGE
                    ? com.aigameplatform.backend.entity.enums.OddOneOutMode.IMAGE : null);
        if (dsl.gameType() == com.aigameplatform.backend.entity.enums.GameType.VISUAL_CLOZE
                && dsl instanceof com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl visual) {
            validateImage(visual, gameId, principal.teacherId());
            game.setVisualClozeMode(visual.effectiveMode() == VisualClozeMode.IMAGE ? VisualClozeMode.IMAGE : null);
        }
        game.setTitle(dsl.metadata().title());
        game.setTopic(dsl.metadata().topic());
        game.setSubject(dsl.metadata().subject());
        game.setGrade(dsl.metadata().gradeLevel());
        game.setSchemaVersion(dsl.schemaVersion());
        game.setQuestionNum(dsl.questions().size());
        var replacementQuestions = strategies.get(dsl.gameType()).parseToQuestions(dsl);
        game.getQuestions().clear();
        game.getQuestions().addAll(replacementQuestions);
        game.setStatus(GameStatus.PUBLISHED);
        game.setShareCode(uniqueShareCode());
        return publishResult(edited ? curriculumReviews.saveEditedGame(game, principal.teacherId()) : games.saveAndFlush(game));
    }

    private void verifyContentForPublish(GameDsl game, String gameId, String teacherId,
            com.aigameplatform.backend.service.media.LoadedSceneImage scene,
            Map<String, com.aigameplatform.backend.service.media.LoadedSceneImage> options) {
        CurriculumEvidence evidence = CurriculumEvidence.empty();
        try {
            var previous = curriculumReviews.getForTeacher(gameId, teacherId);
            if (previous != null && previous.evidence() != null)
                evidence = mapper.treeToValue(previous.evidence(), CurriculumEvidence.class);
        } catch (ApiException notFound) {
            if (notFound.getErrorCode() != ErrorCode.NOT_FOUND) throw notFound;
        }
        if (curriculumRagEnabled && evidence.chunks().isEmpty())
            throw new CurriculumEvidenceNotFoundException("Không tìm thấy căn cứ chương trình để kiểm tra lại trò chơi");
        if (evidence.chunks().stream().anyMatch(chunk -> chunk.subject() != game.metadata().subject()
                || chunk.gradeLevel() != game.metadata().gradeLevel()))
            throw new CurriculumEvidenceNotFoundException(
                    "Căn cứ chương trình không thuộc môn và lớp hiện tại; cần tạo lại trò chơi với phạm vi đúng");
        GeneratedContentReviewer reviewer = reviewerProvider.getIfAvailable();
        if (reviewer == null) throw new GeneratedContentUnverifiedException("SEMANTIC_CONTENT_REVIEWER_UNAVAILABLE");
        GeneratedContentReviewer.Result decision;
        try { decision = scene == null ? reviewer.review(game, game.metadata().topic(), evidence)
                : reviewer.review(game, game.metadata().topic(), evidence, scene, options); }
        catch (RuntimeException unavailable) {
            throw new AiGenerationTimeoutException("Không kiểm tra lại được nội dung trò chơi, vui lòng thử lại sau", unavailable);
        }
        if (decision == null || !decision.accepted())
            throw new GeneratedContentUnverifiedException("PUBLISH_CONTENT_NOT_VERIFIED");
    }

    private void validateAudioVisualImages(com.aigameplatform.backend.dto.dsl.AudioVisualMatchGameDsl dsl) {
        var urls = new java.util.LinkedHashSet<String>();
        for (var question : dsl.questions()) {
            var choices = new java.util.ArrayList<com.aigameplatform.backend.dto.dsl.ImageChoiceDsl>();
            var questionUrls = new java.util.HashSet<String>();
            var questionConcepts = new java.util.HashSet<String>();
            var catalog = new com.aigameplatform.backend.service.media.NotoEmojiCatalog();
            choices.add(question.correct());
            choices.addAll(question.distractors());
            for (var choice : choices) {
                if (choice == null || choice.imageUrl() == null || choice.imageUrl().isBlank())
                    throw new ApiException(ErrorCode.VALIDATION_ERROR, "AUDIO_VISUAL_MATCH options require imageUrl");
                if (!questionUrls.add(choice.imageUrl().trim()))
                    throw new ApiException(ErrorCode.VALIDATION_ERROR, "AUDIO_VISUAL_MATCH option image URLs must be distinct");
                if (choice.imageUrl().startsWith("/assets/noto/")) {
                    var asset = catalog.assets().stream().filter(item -> item.imageUrl().equals(choice.imageUrl())
                            && item.label().equals(choice.visualPrompt())).findFirst()
                            .orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_ERROR,
                                    "Noto option must match a catalog asset and label"));
                    if (!questionConcepts.add(asset.conceptId()))
                        throw new ApiException(ErrorCode.VALIDATION_ERROR, "Noto options cannot depict the same concept twice");
                }
                urls.add(choice.imageUrl());
            }
        }
        if (urls.size() > MAX_OPTION_IMAGES)
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Too many option images to publish");
        if (urls.stream().anyMatch(url -> !url.startsWith("/assets/noto/")))
            throw new ApiException(ErrorCode.VALIDATION_ERROR,
                    "AUDIO_VISUAL_MATCH publication currently requires Noto catalog images for content verification");
    }

    private void validateImage(com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl dsl, String gameId, String teacherId) {
        if (dsl.effectiveMode() != VisualClozeMode.IMAGE) return;
        for (var question : dsl.questions()) {
            com.aigameplatform.backend.service.media.LoadedSceneImage scene;
            try {
                var image = imageLoader.load(URI.create(question.sceneImageUrl()), browserOrigin);
                scene = image;
                if (image.width() != question.sceneWidth() || image.height() != question.sceneHeight()) {
                    throw new ApiException(ErrorCode.VALIDATION_ERROR,
                            "Scene image dimensions changed; regenerate image-based blanks before publishing");
                }
            } catch (InvalidSceneImageException | IllegalArgumentException invalid) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR,
                        "Scene image is invalid or does not meet the image requirements", invalid);
            } catch (SceneImageUnavailableException unavailable) {
                throw new ApiException(ErrorCode.SCENE_IMAGE_UNAVAILABLE,
                        "Scene image service is unavailable; retry publish later", unavailable);
            }
            var distinctOptionUrls = new java.util.LinkedHashSet<String>();
            for (var option : question.options()) {
                if (option.imageUrl() == null || option.imageUrl().isBlank())
                    throw new ApiException(ErrorCode.VALIDATION_ERROR, "IMAGE options require imageUrl");
                distinctOptionUrls.add(option.imageUrl());
            }
            if (distinctOptionUrls.size() > MAX_OPTION_IMAGES)
                throw new ApiException(ErrorCode.VALIDATION_ERROR, "IMAGE games may contain at most 32 option images");
            long optionImageBytes = 0;
            var loadedOptions = new java.util.HashMap<String, com.aigameplatform.backend.service.media.LoadedSceneImage>();
            for (String optionUrl : distinctOptionUrls) {
                try {
                    var optionImage = imageLoader.load(URI.create(optionUrl), browserOrigin);
                    for (var option : question.options())
                        if (optionUrl.equals(option.imageUrl())) loadedOptions.put(question.id() + "/" + option.id(), optionImage);
                    optionImageBytes += optionImage.bytes().length;
                    if (optionImageBytes > MAX_OPTION_IMAGE_BYTES)
                        throw new ApiException(ErrorCode.VALIDATION_ERROR, "Option images exceed the total publish size limit");
                } catch (InvalidSceneImageException | IllegalArgumentException invalid) {
                    throw new ApiException(ErrorCode.VALIDATION_ERROR,
                            "An option image is invalid or unavailable to the browser", invalid);
                } catch (SceneImageUnavailableException unavailable) {
                    throw new ApiException(ErrorCode.SCENE_IMAGE_UNAVAILABLE,
                            "An option image service is unavailable; retry publish later", unavailable);
                }
            }
            var singleQuestion = new com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl(dsl.schemaVersion(),
                    dsl.gameType(), dsl.mode(), dsl.metadata(), dsl.gameplaySettings(), java.util.List.of(question));
            verifyContentForPublish(singleQuestion, gameId, teacherId, scene, loadedOptions);
        }
    }

    private String uniqueShareCode() {
        for (int attempt = 0; attempt < 10; attempt++) {
            StringBuilder code = new StringBuilder(6);
            for (int i = 0; i < 6; i++) code.append(CODE_CHARS[random.nextInt(CODE_CHARS.length)]);
            if (games.findByShareCode(code.toString()).isEmpty()) return code.toString();
        }
        throw new ApiException(ErrorCode.INTERNAL_ERROR, "Could not allocate a share code");
    }

    private Map<String, Object> publishResult(Game game) {
        return Map.of("gameId", game.getId(), "status", "PUBLISHED", "shareCode", game.getShareCode(),
                "shareUrl", shareBaseUrl + "/" + game.getShareCode());
    }
}
