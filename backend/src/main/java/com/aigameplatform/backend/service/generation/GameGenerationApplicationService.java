package com.aigameplatform.backend.service.generation;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.CurriculumServiceUnavailableException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.service.curriculum.CurriculumCatalog;
import com.aigameplatform.backend.service.curriculum.review.GameCurriculumReviewService;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Application boundary: authenticate owner, generate, map using the existing DSL strategy, and save game+review atomically. */
@Service
public class GameGenerationApplicationService {
    public record CurriculumView(
            com.aigameplatform.backend.service.curriculum.review.CurriculumEvidence evidence,
            com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview review) { }
    public record GeneratedGame(String gameId, GameDsl game, CurriculumView curriculum) { }

    private final GameGenerationService generation;
    private final TeacherRepository teachers;
    private final GameContentStrategyRegistry strategies;
    private final GameCurriculumReviewService reviews;
    private final ObjectProvider<CurriculumCatalog> curriculumCatalog;
    private final boolean curriculumRagEnabled;

    public GameGenerationApplicationService(GameGenerationService generation, TeacherRepository teachers,
            GameContentStrategyRegistry strategies, GameCurriculumReviewService reviews,
            ObjectProvider<CurriculumCatalog> curriculumCatalog,
            @Value("${app.curriculum-rag.enabled:false}") boolean curriculumRagEnabled) {
        this.generation = generation;
        this.teachers = teachers;
        this.strategies = strategies;
        this.reviews = reviews;
        this.curriculumCatalog = curriculumCatalog;
        this.curriculumRagEnabled = curriculumRagEnabled;
    }

    public GeneratedGame generateAndSave(com.aigameplatform.backend.entity.enums.GameType type,
            GameDslRequest request, String teacherId) {
        var teacher = teacherId == null ? null : teachers.findById(teacherId).orElse(null);
        if (teacher == null) throw new ApiException(ErrorCode.UNAUTHORIZED, "Cần đăng nhập tài khoản giáo viên");
        if (!curriculumRagEnabled)
            throw new CurriculumServiceUnavailableException("Sinh game có căn cứ chương trình đang tắt", null);
        var catalog = curriculumCatalog.getIfAvailable();
        if (catalog == null)
            throw new CurriculumServiceUnavailableException("Catalog chương trình chưa sẵn sàng", null);
        catalog.requireSupported(type, request.subject(), request.gradeLevel());

        GenerationResult result = generation.generateResult(type, request);
        GameDsl dsl = result.game();
        var game = new Game();
        game.setTitle(dsl.metadata().title());
        game.setGameType(dsl.gameType());
        game.setGrade(dsl.metadata().gradeLevel());
        game.setSubject(dsl.metadata().subject());
        game.setSchemaVersion(dsl.schemaVersion());
        game.setStatus(GameStatus.DRAFT);
        game.setQuestionNum(dsl.questions().size());
        game.setAuthor(teacher);
        game.setQuestions(strategies.get(type).parseToQuestions(dsl));
        Game saved = reviews.saveWithGame(game, result, teacherId);
        return new GeneratedGame(saved.getId(), dsl, new CurriculumView(result.evidence(), result.review()));
    }
}
