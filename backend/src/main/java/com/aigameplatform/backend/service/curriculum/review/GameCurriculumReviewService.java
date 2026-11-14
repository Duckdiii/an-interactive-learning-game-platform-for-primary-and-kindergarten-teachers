package com.aigameplatform.backend.service.curriculum.review;

import com.aigameplatform.backend.entity.enums.CurriculumReviewStatus;
import com.aigameplatform.backend.entity.*;
import com.aigameplatform.backend.exception.*;
import com.aigameplatform.backend.repository.*;
import com.aigameplatform.backend.service.generation.GenerationResult;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Transaction boundary for a prepared game entity and teacher-only provenance. No AI call here. */
@Service
public class GameCurriculumReviewService {
    private final GameRepository games;
    private final GameCurriculumReviewRepository reviews;
    private final JsonMapper mapper;
    public GameCurriculumReviewService(GameRepository games, GameCurriculumReviewRepository reviews, JsonMapper mapper) {
        this.games = games; this.reviews = reviews; this.mapper = mapper;
    }

    public record ReviewView(UUID id, String gameId, Instant createdAt, CurriculumReviewStatus status,
                             JsonNode evidence, JsonNode claims, JsonNode warnings, String datasetVersion,
                             String curriculumVersion, String embeddingModel, String reviewerModel,
                             String curriculumLabel) {
        public ReviewView(UUID id, String gameId, Instant createdAt, CurriculumReviewStatus status,
                          JsonNode evidence, JsonNode claims, JsonNode warnings, String datasetVersion,
                          String curriculumVersion, String embeddingModel, String reviewerModel) {
            this(id, gameId, createdAt, status, evidence, claims, warnings, datasetVersion,
                    curriculumVersion, embeddingModel, reviewerModel, null);
        }
    }

    @Transactional
    public Game saveWithGame(Game game, GenerationResult result, String teacherId) {
        requireTeacher(teacherId);
        if (game == null || game.getAuthor() == null || !teacherId.equals(game.getAuthor().getId()) || game.getId() != null)
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Game mới phải thuộc giáo viên hiện tại");
        var metadata = result.game().metadata();
        if (!Objects.equals(game.getTitle(), metadata.title()) || game.getGameType() != result.game().gameType()
                || game.getGrade() != metadata.gradeLevel() || game.getSubject() != metadata.subject()
                || !Objects.equals(game.getSchemaVersion(), result.game().schemaVersion())
                || game.getQuestionNum() != result.game().questions().size() || game.getQuestions().size() != game.getQuestionNum())
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Game được lưu không khớp kết quả sinh");
        var saved = games.saveAndFlush(game);
        var review = new GameCurriculumReview();
        review.setGame(saved);
        review.setStatus(result.review().status());
        review.setEvidence(mapper.writeValueAsString(result.evidence()));
        review.setClaims(mapper.writeValueAsString(result.review().claims()));
        review.setWarnings(mapper.writeValueAsString(result.review().warnings()));
        review.setDatasetVersion(nonblank(result.evidence().datasetVersion()));
        review.setCurriculumVersion(nonblank(result.evidence().curriculumVersion()));
        review.setEmbeddingModel(nonblank(result.evidence().embeddingModel()));
        review.setReviewerModel(nonblank(result.review().reviewerModel()));
        reviews.saveAndFlush(review);
        return saved;
    }

    @Transactional(readOnly = true)
    public ReviewView getForTeacher(String gameId, String teacherId) {
        requireTeacher(teacherId);
        var review = reviews.findByGame_IdAndGame_Author_Id(gameId, teacherId).orElseThrow(GameCurriculumReviewService::notFound);
        var evidence = mapper.readTree(review.getEvidence());
        return new ReviewView(review.getId(), gameId, review.getCreatedAt(), review.getStatus(),
                evidence, mapper.readTree(review.getClaims()), mapper.readTree(review.getWarnings()),
                review.getDatasetVersion(), review.getCurriculumVersion(), review.getEmbeddingModel(),
                review.getReviewerModel(), curriculumLabel(evidence));
    }

    /** Future game PUT must call this transaction boundary instead of saving directly to GameRepository. */
    @Transactional
    public Game saveEditedGame(Game edited, String teacherId) {
        requireTeacher(teacherId);
        if (edited == null || edited.getId() == null) throw notFound();
        var owned = games.findByIdAndAuthor_Id(edited.getId(), teacherId).orElseThrow(GameCurriculumReviewService::notFound);
        edited.setAuthor(owned.getAuthor());
        var saved = games.saveAndFlush(edited);
        reviews.findByGame_IdAndGame_Author_Id(saved.getId(), teacherId).ifPresent(review -> {
            review.setStatus(CurriculumReviewStatus.STALE);
            review.setWarnings(mapper.writeValueAsString(List.of("GAME_CHANGED_REVIEW_STALE")));
            reviews.saveAndFlush(review);
        });
        return saved;
    }
    private static void requireTeacher(String id) {
        if (id == null || id.isBlank()) throw new ApiException(ErrorCode.UNAUTHORIZED, "Cần đăng nhập tài khoản giáo viên");
    }
    private static ApiException notFound() { return new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy game hoặc kết quả đối chiếu"); }
    private static String nonblank(String value) { return value == null || value.isBlank() ? null : value; }

    private static String curriculumLabel(JsonNode evidence) {
        var chunks = evidence.path("chunks");
        if (!chunks.isArray() || chunks.isEmpty()) return null;
        var ages = new LinkedHashSet<String>();
        for (var chunk : chunks) {
            switch (String.valueOf(chunk.path("ageBand").asString())) {
                case "AGE_3_4" -> ages.add("3–4 tuổi");
                case "AGE_4_5" -> ages.add("4–5 tuổi");
                case "AGE_5_6" -> ages.add("5–6 tuổi");
                default -> { }
            }
        }
        return ages.isEmpty() ? "Căn cứ chương trình đã truy xuất." :
                "Nội dung tương ứng kết quả mong đợi của trẻ " + String.join(", ", ages) + ".";
    }
}
