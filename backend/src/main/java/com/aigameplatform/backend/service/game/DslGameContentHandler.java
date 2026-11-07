package com.aigameplatform.backend.service.game;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.service.generation.GameGenerationService;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.validation.GameValidationService;
import com.aigameplatform.backend.service.validation.ValidationReport;
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
    public GeneratedContent generate(GameType type, String idea, Subject subject, GradeLevel gradeLevel) {
        GameDsl dsl = generation.generate(type, new GameDslRequest(idea, subject, gradeLevel));
        return new GeneratedContent(dsl.metadata().title(), dsl.schemaVersion(), strategies.get(type).parseToQuestions(dsl));
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
        game.setSubject(dsl.metadata().subject());
        game.setGrade(dsl.metadata().gradeLevel());
        game.getQuestions().clear();
        game.getQuestions().addAll(strategies.get(dsl.gameType()).parseToQuestions(dsl));
        game.setQuestionNum(game.getQuestions().size());
    }

    @Override
    public ObjectNode toResponse(Game game, ObjectNode management) {
        ObjectNode body = jsonMapper.valueToTree(strategies.get(game.getGameType()).toGameDsl(game));
        body.setAll(management);
        return body;
    }
}
