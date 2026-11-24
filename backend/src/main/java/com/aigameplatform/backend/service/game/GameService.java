package com.aigameplatform.backend.service.game;

import com.aigameplatform.backend.dto.request.GenerateGameRequest;
import com.aigameplatform.backend.dto.request.RegenerateGameRequest;
import com.aigameplatform.backend.dto.media.SpeechVoice;
import com.aigameplatform.backend.dto.request.ReviseGameRequest;
import com.aigameplatform.backend.dto.response.GameSummaryResponse;
import com.aigameplatform.backend.entity.EditLog;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.EditorType;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.EditLogRepository;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.TeacherRepository;
import com.aigameplatform.backend.service.curriculum.review.GameCurriculumReviewService;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.TreeSet;
import java.util.List;
import java.util.random.RandomGenerator;
import com.aigameplatform.backend.service.curriculum.CurriculumCatalog;
import com.aigameplatform.backend.service.curriculum.CurriculumChunk;
import com.aigameplatform.backend.dto.response.RegeneratedQuestionDto;
import com.aigameplatform.backend.entity.enums.SessionStatus;
import com.aigameplatform.backend.repository.GameSessionRepository;
import com.aigameplatform.backend.service.admin.CostMonitoringService;
import com.aigameplatform.backend.service.media.GameAudioEnricher;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
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

    private static final List<SessionStatus> UNFINISHED = List.of(SessionStatus.WAITING, SessionStatus.ACTIVE, SessionStatus.PAUSED);

    private final GameRepository games;
    private final EditLogRepository editLogs;
    private final TeacherRepository teachers;
    private final List<GameContentHandler> handlers;
    private final JsonMapper jsonMapper;
    private final AiRequestRateLimiter rateLimiter;
    private final TransactionOperations transactions;
    private final GameCurriculumReviewService curriculumReviews;
    private final ObjectProvider<CurriculumCatalog> curriculumCatalog;
    private final RandomGenerator random;
    private final ObjectProvider<GameAudioEnricher> audioEnrichers;
    private final GameSessionRepository sessions;
    private final ObjectProvider<CostMonitoringService> costMonitoring;

    public GameService(GameRepository games, TeacherRepository teachers, List<GameContentHandler> handlers,
            JsonMapper jsonMapper, AiRequestRateLimiter rateLimiter, TransactionOperations transactions,
            GameCurriculumReviewService curriculumReviews, ObjectProvider<CurriculumCatalog> curriculumCatalog,
            RandomGenerator random) {
        this(games, teachers, handlers, jsonMapper, rateLimiter, transactions, curriculumReviews, curriculumCatalog,
                random, null, null, null, null);
    }

    @Autowired
    public GameService(GameRepository games, TeacherRepository teachers, List<GameContentHandler> handlers,
            JsonMapper jsonMapper, AiRequestRateLimiter rateLimiter, TransactionOperations transactions,
            GameCurriculumReviewService curriculumReviews, ObjectProvider<CurriculumCatalog> curriculumCatalog,
            RandomGenerator random, ObjectProvider<GameAudioEnricher> audioEnrichers, GameSessionRepository sessions,
            ObjectProvider<CostMonitoringService> costMonitoring, EditLogRepository editLogs) {
        this.editLogs = editLogs;
        this.costMonitoring = costMonitoring;
        this.sessions = sessions;
        this.audioEnrichers = audioEnrichers;
        this.curriculumCatalog = curriculumCatalog;
        this.random = random;
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
        requireBudgetAvailable();
        GameType type = request.gameType() != null ? request.gameType() : GameType.QUIZ;
        String idea = ideaOf(request, type);

        GameContentHandler handler = handlerFor(type);
        GameContentHandler.GeneratedContent content = handler.generate(type, idea, request);

        Game game = new Game();
        game.setAuthor(teachers.getReferenceById(teacherId));
        game.setGameType(type);
        game.setTitle(content.title());
        game.setTopic(content.topic());
        game.setVisualClozeMode(content.visualClozeMode());
        game.setOddOneOutMode(content.oddOneOutMode());
        game.setSubject(request.subject());
        game.setGrade(request.gradeLevel());
        game.setPresentation(content.presentation());
        game.setSchemaVersion(content.schemaVersion());
        game.setStatus(GameStatus.DRAFT);
        // Sinh giọng đọc TTS cho câu hỏi; lỗi dịch vụ ngoài không làm hỏng luồng tạo game (enricher tự nuốt lỗi).
        GameAudioEnricher enricher = audioEnrichers != null ? audioEnrichers.getIfAvailable() : null;
        if (enricher != null) {
            enricher.enrichAllQuestionsWithAudio(content.questions());
        }
        game.replaceQuestions(content.questions());
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
        Game game = owned(teacherId, gameId, true);
        requireNoUnfinishedSession(gameId);

        ObjectNode before = toResponse(game);
        handlerFor(game.getGameType()).replaceContent(game, body);
        ObjectNode after = toResponse(game);
        before.remove(GameReports.MANAGEMENT_FIELDS);
        after.remove(GameReports.MANAGEMENT_FIELDS);
        List<String> changes = new ArrayList<>();
        diffPaths("", before, after, changes);
        if (changes.isEmpty()) return toResponse(game);

        game.setUpdatedAt(Instant.now());
        Game saved = curriculumReviews.saveEditedGame(game, teacherId);
        EditLog log = new EditLog();
        log.setGame(saved);
        log.setEditedBy(EditorType.TEACHER);
        log.setEditorTeacherId(teacherId);
        log.setEditedAt(LocalDateTime.now());
        log.setChangedPaths(jsonMapper.writeValueAsString(changes));
        editLogs.save(log);
        return toResponse(saved);
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
        requireBudgetAvailable();
        try (AiRequestRateLimiter.Permit permit = rateLimiter.acquire(teacherId)) {
            ObjectNode revised = handlerFor(stored.type()).revise(stored.response(), request.instruction().trim(), request.history());
            GameReports.MANAGEMENT_FIELDS.forEach(field -> revised.set(field, stored.response().get(field)));
            return revised;
        }
    }

    public ObjectNode regenerate(String teacherId, String gameId, RegenerateGameRequest input) {
        StoredGame stored = transactions.execute(status -> {
            Game game = owned(teacherId, gameId);
            requireNoUnfinishedSession(gameId);
            return new StoredGame(game.getGameType(), toResponse(game));
        });
        RegenerateGameRequest request = input == null ? new RegenerateGameRequest(null, null, null) : input;
        requireBudgetAvailable();
        try (AiRequestRateLimiter.Permit permit = rateLimiter.acquire(teacherId)) {
            ObjectNode preview = handlerFor(stored.type()).regenerate(stored.response(), request);
            GameReports.MANAGEMENT_FIELDS.forEach(field -> preview.set(field, stored.response().get(field)));
            return preview;
        }
    }

    /**
     * POST /games/{gameId}/questions/{questionId}/regenerate: AI làm lại một câu, KHÔNG lưu (trình soạn cho giáo viên xem,
     * hoàn tác, rồi lưu bằng PUT). Cùng khuôn với {@link #revise}: kiểm quyền và phiên đang chạy trong transaction ngắn,
     * gọi AI ngoài transaction.
     */
    public RegeneratedQuestionDto regenerateQuestion(String teacherId, String gameId, String questionId, String feedback) {
        return regenerateQuestion(teacherId, gameId, questionId, feedback, null);
    }

    public RegeneratedQuestionDto regenerateQuestion(String teacherId, String gameId, String questionId, String feedback,
            SpeechVoice voice) {
        StoredGame stored = transactions.execute(status -> {
            Game game = owned(teacherId, gameId);
            requireNoUnfinishedSession(gameId);
            return new StoredGame(game.getGameType(), toResponse(game));
        });
        requireBudgetAvailable();
        try (AiRequestRateLimiter.Permit permit = rateLimiter.acquire(teacherId)) {
            GameContentHandler handler = handlerFor(stored.type());
            return voice == null ? handler.regenerateQuestion(stored.response(), questionId, feedback)
                    : handler.regenerateQuestion(stored.response(), questionId, feedback, voice);
        }
    }

    private void requireNoUnfinishedSession(String gameId) {
        if (sessions.hasUnfinishedSession(gameId, UNFINISHED, LocalDateTime.now())) {
            throw new ApiException(ErrorCode.CONFLICT, "Game đang có phiên chơi chưa kết thúc, chưa sửa được");
        }
    }

    private static void diffPaths(String path, JsonNode before, JsonNode after, List<String> changes) {
        if (java.util.Objects.equals(before, after)) return;
        if (before != null && after != null && before.isObject() && after.isObject()) {
            var keys = new TreeSet<>(before.propertyNames());
            keys.addAll(after.propertyNames());
            for (String key : keys) {
                String escaped = key.replace("~", "~0").replace("/", "~1");
                diffPaths(path + "/" + escaped, before.get(key), after.get(key), changes);
            }
        } else if (before != null && after != null && before.isArray() && after.isArray()) {
            for (int index = 0; index < Math.max(before.size(), after.size()); index++) {
                diffPaths(path + "/" + index, before.get(index), after.get(index), changes);
            }
        } else {
            changes.add(path);
        }
    }

    private void requireBudgetAvailable() {
        // Circuit breaker (FR-12): chạm trần chi phí AI tháng thì ngừng nhận yêu cầu sinh game.
        CostMonitoringService cost = costMonitoring == null ? null : costMonitoring.getIfAvailable();
        if (cost != null && cost.isCostCapExceeded()) {
            throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE,
                    "Hệ thống AI tạm thời ngưng nhận yêu cầu sinh game do đã chạm trần chi phí tháng. Vui lòng liên hệ Quản trị viên.");
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
        return owned(teacherId, gameId, false);
    }

    private Game owned(String teacherId, String gameId, boolean lock) {
        requireTeacher(teacherId);
        Game game = (lock ? games.findByIdForUpdate(gameId) : games.findById(gameId))
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

    private String ideaOf(GenerateGameRequest request, GameType type) {
        if (request.hasIdea()) return request.idea().trim();
        if (type == GameType.CUSTOM) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Trò chơi ngoài danh mục cần mô tả ý tưởng");
        }
        if (request.wantsRandomTopic()) return randomTopic(request);
        throw new ApiException(ErrorCode.VALIDATION_ERROR, "Vui lòng nhập ý tưởng hoặc tải giáo án");
    }

    /**
     * Có danh mục chương trình (bật RAG) thì chọn ngẫu nhiên một yêu cầu cần đạt của đúng môn/lớp, để bước truy hồi có căn
     * cứ thật; không có thì dùng câu chung, AI tự chọn chủ đề.
     */
    private String randomTopic(GenerateGameRequest request) {
        CurriculumCatalog catalog = curriculumCatalog.getIfAvailable();
        if (catalog == null) return RANDOM_TOPIC;
        List<CurriculumChunk> outcomes = catalog.requireDataset(request.subject(), request.gradeLevel()).chunks().stream()
                .filter(chunk -> !chunk.control()).toList();
        if (outcomes.isEmpty()) {
            throw new ApiException(ErrorCode.CURRICULUM_EVIDENCE_NOT_FOUND, "Chưa có yêu cầu cần đạt nào cho môn và lớp đã chọn");
        }
        return outcomes.get(random.nextInt(outcomes.size())).topic();
    }

    private static void requireTeacher(String teacherId) {
        if (teacherId == null || teacherId.isBlank()) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, "Cần đăng nhập tài khoản giáo viên");
        }
    }
}
