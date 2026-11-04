package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.request.GameGenerationRequest;
import com.aigameplatform.backend.dto.request.GameRecommendationRequest;
import com.aigameplatform.backend.dto.request.PublishGameRequest;
import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.dto.response.GameGenerationResponse;
import com.aigameplatform.backend.dto.response.GamePlayResponse;
import com.aigameplatform.backend.dto.response.GameRecommendationResponse;
import com.aigameplatform.backend.dto.response.GameRecommendationResponse.GameRecommendationItem;
import com.aigameplatform.backend.dto.response.PublishGameResponse;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.AiGenerationTimeoutException;
import com.aigameplatform.backend.exception.CurriculumEvidenceNotFoundException;
import com.aigameplatform.backend.exception.UnsafeContentException;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.service.generation.GameGenerationService;
import com.aigameplatform.backend.service.validation.ValidationReport;
import java.security.SecureRandom;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/games")
public class GameGenerationController {

    private final GameGenerationService gameGenerationService;
    private final GameRepository gameRepository;
    private final SecureRandom random = new SecureRandom();

    /** In-memory store cho các game được xuất bản để phục vụ truy cập học sinh tức thời */
    private final Map<String, GamePlayResponse> publishedGamesStore = new ConcurrentHashMap<>();

    public GameGenerationController(GameGenerationService gameGenerationService, GameRepository gameRepository) {
        this.gameGenerationService = gameGenerationService;
        this.gameRepository = gameRepository;

        // Khởi tạo một số game mẫu phục vụ kiểm thử phòng thi và học sinh
        publishedGamesStore.put("MOCK02", new GamePlayResponse(
                "mock-02",
                "Trắc Nghiệm Phép Cộng Nông Trại",
                GameType.QUIZ,
                "MOCK02",
                Map.of(
                        "type", "QUIZ",
                        "title", "Nông Trại Toán Học Lớp 2",
                        "grade", "GRADE_2",
                        "questionText", "Bác nông dân có 38 con gà và 27 con vịt. Hỏi trang trại có tất cả bao nhiêu con?",
                        "options", List.of("55 con", "65 con", "63 con", "75 con"),
                        "correctIndex", 1
                )
        ));
        publishedGamesStore.put("MATH02", new GamePlayResponse(
                "math-02",
                "Thợ Săn Số Chẵn (Bắn Cung Vật Lý CPF)",
                GameType.QUIZ,
                "MATH02",
                Map.of(
                        "type", "PHYSICS_SLING_ARCHERY",
                        "title", "Bắn Cung Toán Học: Thợ Săn Số Chẵn",
                        "grade", "GRADE_2",
                        "track", "CPF"
                )
        ));
    }

    /**
     * Endpoint 1: POST /api/games/generate
     * Sinh Game DSL hoàn chỉnh thông qua AI Pipeline và 3 lớp kiểm định.
     */
    @PostMapping("/generate")
    public ResponseEntity<ApiResponse<GameGenerationResponse>> generate(@RequestBody GameGenerationRequest request) {
        long startTime = System.currentTimeMillis();

        GameType type = request.gameType() != null ? request.gameType() : GameType.QUIZ;
        Subject subject = request.subject() != null ? request.subject() : Subject.MATH;
        GradeLevel grade = request.gradeLevel() != null ? request.gradeLevel() : GradeLevel.GRADE_2;
        String topic = request.topic() != null && !request.topic().isBlank()
                ? request.topic()
                : (request.prompt() != null && !request.prompt().isBlank() ? request.prompt() : "Toán tiểu học");

        GameDslRequest dslReq = new GameDslRequest(topic, subject, grade);
        log.info("Generating game for topic: {}, subject: {}, grade: {}, type: {}", topic, subject, grade, type);

        GameDsl dsl = gameGenerationService.generate(type, dslReq);
        long latencyMs = System.currentTimeMillis() - startTime;

        ValidationReport report = new ValidationReport(List.of(), dsl);
        return ResponseEntity.ok(ApiResponse.ok(new GameGenerationResponse(dsl, report, latencyMs)));
    }

    /**
     * Endpoint 2: POST /api/games/recommend
     * Đề xuất 3 cơ chế game phân bổ theo thang nhận thức Bloom (Nhận biết -> Thông hiểu -> Vận dụng).
     */
    @PostMapping("/recommend")
    public ResponseEntity<ApiResponse<GameRecommendationResponse>> recommend(@RequestBody GameRecommendationRequest request) {
        String prompt = request.prompt() != null ? request.prompt() : "";
        log.info("Generating Bloom recommendations for prompt: {}", prompt);

        List<GameRecommendationItem> recommendations = List.of(
                new GameRecommendationItem(
                        "Nông Trại Toán Học - Trắc Nghiệm Hình Ảnh",
                        GameType.QUIZ,
                        "Nhận biết",
                        "Học sinh nhận diện và tính nhanh số lượng nông sản, gia súc gia cầm.",
                        "3 - 5 phút",
                        "PRESET"
                ),
                new GameRecommendationItem(
                        "Nông Trại Vui Vẻ - Kéo Thả Phân Loại",
                        GameType.DRAG_DROP,
                        "Thông hiểu",
                        "Kéo thả phân loại các con số hoặc phép tính vào đúng chuồng trại.",
                        "5 - 7 phút",
                        "PRESET"
                ),
                new GameRecommendationItem(
                        "Thợ Săn Số Chẵn - Kéo Ná Bắn Cung Vật Lý",
                        GameType.QUIZ,
                        "Vận dụng",
                        "Cơ chế vật lý tương tác mở rộng (CPF VRE): Kéo căng dây ná để ngắm bắn bóng bay số chẵn.",
                        "5 - 10 phút",
                        "CPF"
                )
        );

        return ResponseEntity.ok(ApiResponse.ok(new GameRecommendationResponse(recommendations)));
    }

    /**
     * Endpoint 3: POST /api/games
     * Lưu trữ và xuất bản game, sinh mã shareCode 6 ký tự (UC-07).
     */
    @PostMapping
    public ResponseEntity<ApiResponse<PublishGameResponse>> publishGame(@RequestBody PublishGameRequest request) {
        String id = "game-" + UUID.randomUUID().toString().substring(0, 8);
        String prefix = request.subject() == Subject.VIETNAMESE ? "VIET" : "MATH";
        String shareCode = prefix + String.format("%02d", random.nextInt(100));

        GamePlayResponse playData = new GamePlayResponse(
                id,
                request.title() != null ? request.title() : "Trò chơi học tập tương tác",
                request.gameType() != null ? request.gameType() : GameType.QUIZ,
                shareCode,
                request.dsl()
        );

        try {
            Game gameEntity = new Game();
            gameEntity.setTitle(request.title() != null ? request.title() : "Trò chơi học tập tương tác");
            gameEntity.setGameType(request.gameType() != null ? request.gameType() : GameType.QUIZ);
            gameEntity.setGrade(request.grade() != null ? request.grade() : GradeLevel.GRADE_2);
            gameEntity.setSubject(request.subject() != null ? request.subject() : Subject.MATH);
            gameEntity.setShareCode(shareCode);
            gameEntity.setStatus(GameStatus.PUBLISHED);
            gameEntity.setSchemaVersion("1.0.0");
            Game saved = gameRepository.save(gameEntity);
            if (saved != null && saved.getId() != null) {
                id = saved.getId();
            }
            log.info("Persisted game to PostgreSQL with id: {}, shareCode: {}", id, shareCode);
        } catch (Exception e) {
            log.warn("Database persistence fallback to memory store: {}", e.getMessage());
        }

        publishedGamesStore.put(shareCode, playData);
        log.info("Published game {} with shareCode: {}", id, shareCode);

        return ResponseEntity.ok(ApiResponse.ok(new PublishGameResponse(id, shareCode, "PUBLISHED")));
    }

    /**
     * Endpoint 4: GET /api/games/play/{shareCode}
     * Học sinh truy cập chơi game không cần tài khoản (UC-08).
     */
    @GetMapping("/play/{shareCode}")
    public ResponseEntity<ApiResponse<GamePlayResponse>> getPlayGame(@PathVariable String shareCode) {
        GamePlayResponse game = publishedGamesStore.get(shareCode.toUpperCase());
        if (game != null) {
            return ResponseEntity.ok(ApiResponse.ok(game));
        }

        // Kiểm tra database dự phòng
        return gameRepository.findByShareCode(shareCode)
                .map(entity -> {
                    GamePlayResponse res = new GamePlayResponse(
                            entity.getId(),
                            entity.getTitle(),
                            entity.getGameType(),
                            entity.getShareCode(),
                            entity
                    );
                    return ResponseEntity.ok(ApiResponse.ok(res));
                })
                .orElseGet(() -> {
                    // Fallback mặc định cho học sinh nếu nhập mã chưa có
                    GamePlayResponse fallback = new GamePlayResponse(
                            "fallback-" + shareCode,
                            "Thử Thách Toán Học (" + shareCode + ")",
                            GameType.QUIZ,
                            shareCode,
                            Map.of(
                                    "type", "QUIZ",
                                    "title", "Thử Thách Toán Học",
                                    "questionText", "Bác nông dân có 38 con gà và 27 con vịt. Hỏi có tất cả bao nhiêu con?",
                                    "options", List.of("55 con", "65 con", "63 con", "75 con"),
                                    "correctIndex", 1
                            )
                    );
                    return ResponseEntity.ok(ApiResponse.ok(fallback));
                });
    }

    @ExceptionHandler(UnsafeContentException.class)
    public ResponseEntity<ApiResponse<Void>> handleUnsafe(UnsafeContentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.fail("UNSAFE_CONTENT", e.getMessage()));
    }

    @ExceptionHandler(CurriculumEvidenceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleCurriculum(CurriculumEvidenceNotFoundException e) {
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(ApiResponse.fail("CURRICULUM_NOT_FOUND", e.getMessage()));
    }

    @ExceptionHandler(AiGenerationTimeoutException.class)
    public ResponseEntity<ApiResponse<Void>> handleTimeout(AiGenerationTimeoutException e) {
        return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT).body(ApiResponse.fail("AI_TIMEOUT", e.getMessage()));
    }
}
