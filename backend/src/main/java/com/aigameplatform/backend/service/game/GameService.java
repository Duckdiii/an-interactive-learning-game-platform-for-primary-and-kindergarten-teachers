package com.aigameplatform.backend.service.game;

import com.aigameplatform.backend.dto.request.GenerateGameRequest;
import com.aigameplatform.backend.dto.request.ReviseGameRequest;
import com.aigameplatform.backend.dto.response.GameSummaryResponse;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.service.curriculum.review.GameCurriculumReviewService;
import java.time.Instant;
import java.util.List;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionOperations;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * Nghiệp vụ nhóm Games của openapi.yaml: sinh, liệt kê, mở, sửa, xóa game của giáo viên đang đăng nhập. Phần riêng
 * theo dạng nội dung (DSL hay CPF) giao cho {@link GameContentHandler} chọn theo {@code gameType}.
 */
@Service
public class GameService {

    static final String RANDOM_TOPIC = "Chủ đề ngẫu nhiên phù hợp lứa tuổi và chương trình của khối lớp";

    private final GameRepository games;
    private final TeacherRepository teachers;
    private final List<GameContentHandler> handlers;
    private final JsonMapper jsonMapper;
    private final AiRequestRateLimiter rateLimiter;
    private final TransactionOperations transactions;
    private final GameCurriculumReviewService curriculumReviews;

    public GameService(GameRepository games, TeacherRepository teachers, List<GameContentHandler> handlers,
            JsonMapper jsonMapper, AiRequestRateLimiter rateLimiter, TransactionOperations transactions,
            GameCurriculumReviewService curriculumReviews) {
        this.games = games;
        this.teachers = teachers;
        this.handlers = handlers;
        this.jsonMapper = jsonMapper;
        this.rateLimiter = rateLimiter;
        this.transactions = transactions;
        this.curriculumReviews = curriculumReviews;
    }

    /**
     * POST /games/generate: sinh bằng AI, đã qua 3 lớp kiểm duyệt, lưu ở trạng thái DRAFT. Cố ý KHÔNG bọc transaction:
     * gọi AI có thể mất hàng chục giây, giữ kết nối suốt lúc đó sẽ cạn pool Hikari (5 kết nối); chỉ bước lưu chạy trong
     * transaction ngắn (của repository, hoặc của {@code saveWithGame} khi lưu kèm bản đối chiếu chương trình).
     */
    public ObjectNode generate(String teacherId, GenerateGameRequest request) {
        requireTeacher(teacherId);
        GameType type = request.gameType() != null ? request.gameType() : GameType.QUIZ;
        String idea = ideaOf(request, type);

        GameContentHandler handler = handlerFor(type);
        GameContentHandler.GeneratedContent content = handler.generate(type, idea, request.subject(), request.gradeLevel());

        Game game = new Game();
        game.setAuthor(teachers.getReferenceById(teacherId));
        game.setGameType(type);
        game.setTitle(content.title());
        game.setSubject(request.subject());
        game.setGrade(request.gradeLevel());
        game.setPresentation(content.presentation());
        game.setSchemaVersion(content.schemaVersion());
        game.setStatus(GameStatus.DRAFT);
        game.getQuestions().addAll(content.questions());
        game.setQuestionNum(content.questions().size());
        // Có kết quả đối chiếu chương trình (game DSL) thì lưu game và bản đối chiếu trong cùng một transaction.
        Game saved = content.curriculum() == null ? games.saveAndFlush(game)
                : curriculumReviews.saveWithGame(game, content.curriculum(), teacherId);
        return toResponse(saved);
    }

    /** GET /games: game của giáo viên, mới sửa trước. Bộ lọc nào null thì bỏ qua. */
    @Transactional(readOnly = true)
    public List<GameSummaryResponse> list(String teacherId, Subject subject, GradeLevel gradeLevel, GameStatus status) {
        requireTeacher(teacherId);
        return games.findByAuthor_IdOrderByUpdatedAtDesc(teacherId).stream()
                .filter(g -> subject == null || g.getSubject() == subject)
                .filter(g -> gradeLevel == null || g.getGrade() == gradeLevel)
                .filter(g -> status == null || g.getStatus() == status)
                .map(GameSummaryResponse::of)
                .toList();
    }

    @Transactional(readOnly = true)
    public ObjectNode get(String teacherId, String gameId) {
        return toResponse(owned(teacherId, gameId));
    }

    /** PUT /games/{gameId}: kiểm duyệt lại đủ 3 lớp; game giữ trạng thái và loại. */
    @Transactional
    public ObjectNode update(String teacherId, String gameId, JsonNode body) {
        Game game = owned(teacherId, gameId);
        handlerFor(game.getGameType()).replaceContent(game, body);
        // Chỉ sửa câu hỏi thì hàng games không "bẩn" nên @UpdateTimestamp không chạy; đặt tường minh để GET /games sắp đúng.
        game.setUpdatedAt(Instant.now());
        // Lưu qua bước này để bản đối chiếu chương trình (nếu có) chuyển STALE: nội dung đã khác lúc đối chiếu.
        return toResponse(curriculumReviews.saveEditedGame(game, teacherId));
    }

    /**
     * POST /games/{gameId}/revise: AI sửa game đang lưu theo yêu cầu chat, qua đủ 3 lớp kiểm duyệt, KHÔNG lưu (trình soạn
     * áp vào bản nháp rồi lưu bằng PUT). Đọc game trong transaction ngắn rồi gọi AI ngoài transaction, như {@link #generate},
     * để không giữ kết nối Hikari suốt lúc chờ AI.
     */
    public ObjectNode revise(String teacherId, String gameId, ReviseGameRequest request) {
        StoredGame stored = transactions.execute(status -> {
            Game game = owned(teacherId, gameId);
            return new StoredGame(game.getGameType(), toResponse(game));
        });
        // Kiểm quyền (403/404) trước khi tính vào hạn mức, để lỗi sai game không ăn mất lượt của giáo viên.
        try (AiRequestRateLimiter.Permit permit = rateLimiter.acquire(teacherId)) {
            ObjectNode revised = handlerFor(stored.type()).revise(stored.response(), request.instruction().trim(), request.history());
            GameReports.MANAGEMENT_FIELDS.forEach(field -> revised.set(field, stored.response().get(field)));
            return revised;
        }
    }

    private record StoredGame(GameType type, ObjectNode response) {
    }

    /** 409 khi game còn dữ liệu liên quan (phiên chơi) giữ khóa ngoại, thay vì 500. */
    @Transactional
    public void delete(String teacherId, String gameId) {
        Game game = owned(teacherId, gameId);
        try {
            games.delete(game);
            games.flush();
        } catch (DataIntegrityViolationException e) {
            throw new ApiException(ErrorCode.CONFLICT, "Trò chơi đã có phiên chơi, chưa xóa được");
        }
    }

    private Game owned(String teacherId, String gameId) {
        requireTeacher(teacherId);
        Game game = games.findById(gameId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy trò chơi"));
        if (game.getAuthor() == null || !teacherId.equals(game.getAuthor().getId())) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Bạn không có quyền với trò chơi này");
        }
        return game;
    }

    private ObjectNode toResponse(Game game) {
        ObjectNode management = jsonMapper.createObjectNode();
        management.put("gameId", game.getId());
        management.put("status", game.getStatus().name());
        management.put("updatedAt", game.getUpdatedAt() == null ? null : game.getUpdatedAt().toString());
        return handlerFor(game.getGameType()).toResponse(game, management);
    }

    private GameContentHandler handlerFor(GameType type) {
        return handlers.stream().filter(h -> h.handles(type)).findFirst()
                .orElseThrow(() -> new IllegalStateException("Không có handler cho loại game " + type));
    }

    private static String ideaOf(GenerateGameRequest request, GameType type) {
        if (request.hasIdea()) return request.idea().trim();
        if (type == GameType.CUSTOM) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Trò chơi ngoài danh mục cần mô tả ý tưởng");
        }
        if (request.wantsRandomTopic()) return RANDOM_TOPIC;
        throw new ApiException(ErrorCode.VALIDATION_ERROR, "Vui lòng nhập ý tưởng hoặc tải giáo án");
    }

    private static void requireTeacher(String teacherId) {
        if (teacherId == null || teacherId.isBlank()) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, "Cần đăng nhập tài khoản giáo viên");
        }
    }
}
