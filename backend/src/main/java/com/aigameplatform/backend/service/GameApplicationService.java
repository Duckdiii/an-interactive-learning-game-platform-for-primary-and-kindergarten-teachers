package com.aigameplatform.backend.service;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.request.GenerateGameRequest;
import com.aigameplatform.backend.dto.response.GameResponse;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.curriculum.CurriculumCatalog;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.service.generation.GameGenerationService;
import com.aigameplatform.backend.service.generation.GenerationResult;
import com.aigameplatform.backend.service.curriculum.review.GameCurriculumReviewService;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import java.security.SecureRandom;
import java.util.List;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

@Service
public class GameApplicationService {
    private final GameGenerationService generation;
    private final TeacherRepository teachers;
    private final GameCurriculumReviewService curriculumReviews;
    private final GameContentStrategyRegistry strategies;
    private final ObjectProvider<CurriculumCatalog> curriculumCatalog;
    private final JsonMapper mapper;
    private final SecureRandom random = new SecureRandom();

    public GameApplicationService(GameGenerationService generation, TeacherRepository teachers,
            GameCurriculumReviewService curriculumReviews, GameContentStrategyRegistry strategies,
            ObjectProvider<CurriculumCatalog> curriculumCatalog, JsonMapper mapper) {
        this.generation = generation;
        this.teachers = teachers;
        this.curriculumReviews = curriculumReviews;
        this.strategies = strategies;
        this.curriculumCatalog = curriculumCatalog;
        this.mapper = mapper;
    }

    @Transactional
    public ObjectNode generate(GenerateGameRequest input, AuthenticatedTeacher principal) {
        if (principal == null) throw new ApiException(ErrorCode.UNAUTHORIZED, "Authentication required");
        Teacher teacher = teachers.findById(principal.teacherId())
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED, "Teacher account is unavailable"));
        String topic = topicFor(input);
        VisualClozeMode mode = input.effectiveMode();
        boolean visualImage = mode == VisualClozeMode.IMAGE
                && input.gameType() == com.aigameplatform.backend.entity.enums.GameType.VISUAL_CLOZE;
        boolean oddImage = mode == VisualClozeMode.IMAGE
                && input.gameType() == com.aigameplatform.backend.entity.enums.GameType.ODD_ONE_OUT;
        boolean avmCatalog = mode == VisualClozeMode.IMAGE
                && input.gameType() == com.aigameplatform.backend.entity.enums.GameType.AUDIO_VISUAL_MATCH;
        if (mode != VisualClozeMode.TEXT && !visualImage && !oddImage && !avmCatalog)
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "IMAGE mode is not available for this game type");
        if (visualImage && (input.sceneImageUrl() == null || input.sceneImageUrl().isBlank()))
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "sceneImageUrl is required for IMAGE mode");
        if (visualImage && (input.optionImages() == null || input.optionImages().size() < 2
                || input.optionImages().size() > 8 || input.optionImages().stream().anyMatch(asset -> asset == null
                        || asset.imageUrl() == null || asset.imageUrl().isBlank()
                        || asset.visualPrompt() == null || asset.visualPrompt().isBlank())))
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "IMAGE mode requires 2 to 8 teacher-provided optionImages");
        if (visualImage && input.optionImages().stream().map(GenerateGameRequest.OptionImage::imageUrl)
                .distinct().count() != input.optionImages().size())
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "optionImages must use distinct imageUrl values");

        GameDslRequest request = new GameDslRequest(topic, input.subject(), input.gradeLevel(), null, null,
                mode, input.sceneImageUrl(), input.optionImages());
        GenerationResult generationResult = generation.generateResult(input.gameType(), request);
        GameDsl dsl = generationResult.game();
        Game game = new Game();
        game.setTitle(dsl.metadata().title());
        game.setTopic(dsl.metadata().topic());
        game.setGameType(dsl.gameType());
        game.setSubject(dsl.metadata().subject());
        game.setGrade(dsl.metadata().gradeLevel());
        game.setSchemaVersion(dsl.schemaVersion());
        game.setVisualClozeMode(visualImage ? mode : null);
        game.setOddOneOutMode(oddImage ? com.aigameplatform.backend.entity.enums.OddOneOutMode.IMAGE : null);
        game.setQuestionNum(dsl.questions().size());
        game.setStatus(GameStatus.DRAFT);
        game.setAuthor(teacher);
        game.setQuestions(strategies.get(dsl.gameType()).parseToQuestions(dsl));
        Game saved = curriculumReviews.saveWithGame(game, generationResult, principal.teacherId());
        return GameResponse.withEnvelope(saved, dsl, mapper);
    }

    private String topicFor(GenerateGameRequest input) {
        if (Boolean.TRUE.equals(input.randomTopic())) {
            CurriculumCatalog catalog = curriculumCatalog.getIfAvailable();
            if (catalog == null) throw new ApiException(ErrorCode.GENERATION_SCOPE_UNSUPPORTED,
                    "No reviewed curriculum catalog is available for random topic selection");
            var dataset = catalog.requireDataset(input.subject(), input.gradeLevel());
            List<com.aigameplatform.backend.service.curriculum.CurriculumChunk> outcomes = dataset.chunks().stream()
                    .filter(chunk -> !chunk.control()).toList();
            if (outcomes.isEmpty()) throw new ApiException(ErrorCode.CURRICULUM_EVIDENCE_NOT_FOUND,
                    "No reviewed curriculum outcomes are available for this scope");
            return outcomes.get(random.nextInt(outcomes.size())).topic();
        }
        if (input.idea() == null || input.idea().isBlank())
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Provide idea or set randomTopic=true");
        return input.idea().trim();
    }
}
