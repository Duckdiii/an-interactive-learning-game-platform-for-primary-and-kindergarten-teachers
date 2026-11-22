package com.aigameplatform.backend.service.game;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl;
import com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl;
import com.aigameplatform.backend.dto.request.GenerateGameRequest;
import com.aigameplatform.backend.dto.understanding.ChatTurn;
import com.aigameplatform.backend.entity.enums.OddOneOutMode;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.dto.dsl.PresentationDsl;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.service.generation.GameGenerationService;
import com.aigameplatform.backend.service.generation.GenerationResult;
import com.aigameplatform.backend.service.generation.Revision;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.validation.GameValidationService;
import com.aigameplatform.backend.service.validation.ValidationReport;
import java.util.List;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** 10 loại Game JSON DSL v1.0.0: dùng lại bộ sinh, chuỗi kiểm duyệt và strategy ánh xạ DSL ↔ entity đã có. */
@Component
public class DslGameContentHandler implements GameContentHandler {

    private final GameGenerationService generation;
    private final GameValidationService validation;
    private final GameContentStrategyRegistry strategies;
    private final JsonMapper jsonMapper;

    public DslGameContentHandler(GameGenerationService generation, GameValidationService validation,
            GameContentStrategyRegistry strategies, JsonMapper jsonMapper) {
        this.generation = generation;
        this.validation = validation;
        this.strategies = strategies;
        this.jsonMapper = jsonMapper;
    }

    @Override
    public boolean handles(GameType type) {
        return type != GameType.CUSTOM;
    }

    @Override
    public GeneratedContent generate(GameType type, String idea, GenerateGameRequest input) {
        VisualClozeMode mode = input.effectiveMode();
        requireSupportedImageMode(type, mode, input);
        GenerationResult result = generation.generateResult(type, new GameDslRequest(idea, input.subject(),
                input.gradeLevel(), null, null, mode, input.sceneImageUrl(), input.optionImages()));
        GameDsl dsl = result.game();
        return new GeneratedContent(dsl.metadata().title(), dsl.schemaVersion(), strategies.get(type).parseToQuestions(dsl),
                PresentationDsl.toEntity(dsl.metadata().presentation()), result, dsl.metadata().topic(),
                visualClozeModeOf(dsl), oddOneOutModeOf(dsl));
    }

    /** Chế độ IMAGE chỉ có ở VISUAL_CLOZE (cần ảnh cảnh và 2–8 ảnh lựa chọn), ODD_ONE_OUT và AUDIO_VISUAL_MATCH. */
    private static void requireSupportedImageMode(GameType type, VisualClozeMode mode, GenerateGameRequest input) {
        if (mode == VisualClozeMode.TEXT) return;
        if (type != GameType.VISUAL_CLOZE && type != GameType.ODD_ONE_OUT && type != GameType.AUDIO_VISUAL_MATCH) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Loại trò chơi này chưa hỗ trợ chế độ hình ảnh");
        }
        if (type != GameType.VISUAL_CLOZE) return;
        if (input.sceneImageUrl() == null || input.sceneImageUrl().isBlank()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Chế độ hình ảnh cần sceneImageUrl");
        }
        List<GenerateGameRequest.OptionImage> options = input.optionImages();
        if (options == null || options.size() < 2 || options.size() > 8 || options.stream().anyMatch(option -> option == null
                || option.imageUrl() == null || option.imageUrl().isBlank()
                || option.visualPrompt() == null || option.visualPrompt().isBlank())) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Chế độ hình ảnh cần 2 đến 8 ảnh lựa chọn do giáo viên cung cấp");
        }
        if (options.stream().map(GenerateGameRequest.OptionImage::imageUrl).distinct().count() != options.size()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Các ảnh lựa chọn phải có imageUrl khác nhau");
        }
    }

    private static VisualClozeMode visualClozeModeOf(GameDsl dsl) {
        return dsl instanceof VisualClozeGameDsl visual && visual.effectiveMode() == VisualClozeMode.IMAGE
                ? VisualClozeMode.IMAGE : null;
    }

    private static OddOneOutMode oddOneOutModeOf(GameDsl dsl) {
        return dsl instanceof OddOneOutGameDsl odd && odd.effectiveMode() == OddOneOutMode.IMAGE ? OddOneOutMode.IMAGE : null;
    }

    @Override
    public void replaceContent(Game game, JsonNode body) {
        ValidationReport report = validation.validate(body);
        GameReports.throwIfRejected(report.valid(), report.unsafe(), report.unavailable(), report.errors());
        GameDsl dsl = report.game();
        if (dsl.gameType() != game.getGameType()) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Không đổi được loại game (" + game.getGameType() + ")");
        }
        game.setTitle(dsl.metadata().title());
        game.setTopic(dsl.metadata().topic());
        game.setSubject(dsl.metadata().subject());
        game.setGrade(dsl.metadata().gradeLevel());
        game.setSchemaVersion(dsl.schemaVersion());
        game.setVisualClozeMode(visualClozeModeOf(dsl));
        game.setOddOneOutMode(oddOneOutModeOf(dsl));
        game.setPresentation(PresentationDsl.toEntity(dsl.metadata().presentation()));
        game.getQuestions().clear();
        game.getQuestions().addAll(strategies.get(dsl.gameType()).parseToQuestions(dsl));
        game.setQuestionNum(game.getQuestions().size());
    }

    @Override
    public ObjectNode revise(ObjectNode current, String instruction, List<ChatTurn> history) {
        ObjectNode content = current.deepCopy();
        content.remove(GameReports.MANAGEMENT_FIELDS);
        // Bộ sinh lại chỉ có dạng chữ: cho AI sửa game ảnh sẽ trả game chữ và mất ảnh cảnh, ô trống (KNOWN-GAPS #27).
        if ("IMAGE".equals(content.path("mode").asString(null))) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Chưa hỗ trợ sửa bằng trò chuyện cho trò chơi chế độ hình ảnh");
        }
        GameType type = GameType.valueOf(content.path("gameType").asString());
        JsonNode metadata = content.path("metadata");
        Revision revision = new Revision(jsonMapper.writeValueAsString(content), instruction, history, Revision.DSL_FORMAT);
        // Như generate: game không lưu nhóm tuổi mầm non hay lĩnh vực, nên không có gì để chuyển tiếp (null).
        GameDsl dsl = generation.revise(type, new GameDslRequest(metadata.path("topic").asString(),
                Subject.valueOf(metadata.path("subject").asString()), GradeLevel.valueOf(metadata.path("gradeLevel").asString())),
                revision);
        ObjectNode revised = jsonMapper.valueToTree(dsl);
        MediaCarryOver.restore(content, revised);
        // Cách trình bày là tùy chọn trong đầu ra AI: AI bỏ trống thì giữ cách trình bày giáo viên đang dùng.
        if (!revised.path("metadata").has("presentation") && metadata.has("presentation")) {
            ((ObjectNode) revised.get("metadata")).set("presentation", metadata.get("presentation"));
        }
        return revised;
    }

    @Override
    public ObjectNode toResponse(Game game, ObjectNode management) {
        ObjectNode body = jsonMapper.valueToTree(strategies.get(game.getGameType()).toGameDsl(game));
        body.setAll(management);
        return body;
    }
}
