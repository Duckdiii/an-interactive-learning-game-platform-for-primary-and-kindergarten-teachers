package com.aigameplatform.backend.service.game;

import com.aigameplatform.backend.dto.understanding.ChatTurn;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.question.CpfQuestion;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.service.generation.Revision;
import com.aigameplatform.backend.service.generation.cpf.CpfGenerationService;
import com.aigameplatform.backend.service.validation.cpf.CpfValidationReport;
import com.aigameplatform.backend.service.validation.cpf.CpfValidationService;
import java.util.List;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * Game ngoài danh mục (CUSTOM, CPF Game v2.0.0): một {@link CpfQuestion} giữ toàn bộ JSON đã kiểm duyệt
 * (docs/cpf-game-v2.0.0.md mục 7). Response đặt game trong trường {@code cpf} (openapi.yaml {@code CpfGameResponse}).
 */
@Component
public class CpfGameContentHandler implements GameContentHandler {

    static final String SCHEMA_VERSION = "2.0.0";

    private final CpfGenerationService generation;
    private final CpfValidationService validation;
    private final JsonMapper jsonMapper;

    public CpfGameContentHandler(CpfGenerationService generation, CpfValidationService validation, JsonMapper jsonMapper) {
        this.generation = generation;
        this.validation = validation;
        this.jsonMapper = jsonMapper;
    }

    @Override
    public boolean handles(GameType type) {
        return type == GameType.CUSTOM;
    }

    @Override
    public GeneratedContent generate(GameType type, String idea, Subject subject, GradeLevel gradeLevel) {
        JsonNode cpf = generation.generate(idea, subject, gradeLevel);
        return new GeneratedContent(cpf.path("metadata").path("title").asString(), SCHEMA_VERSION, List.of(question(cpf)), null);
    }

    @Override
    public void replaceContent(Game game, JsonNode body) {
        CpfValidationReport report = validation.validate(body);
        GameReports.throwIfRejected(report.valid(), report.unsafe(), report.unavailable(), report.errors());
        JsonNode cpf = report.game();
        JsonNode metadata = cpf.path("metadata");
        game.setTitle(metadata.path("title").asString());
        game.setSubject(Subject.valueOf(metadata.path("subject").asString()));
        game.setGrade(GradeLevel.valueOf(metadata.path("gradeLevel").asString()));
        game.getQuestions().clear();
        game.getQuestions().add(question(cpf));
        game.setQuestionNum(1);
    }

    @Override
    public ObjectNode revise(ObjectNode current, String instruction, List<ChatTurn> history) {
        JsonNode cpf = current.path("cpf");
        JsonNode metadata = cpf.path("metadata");
        Revision revision = new Revision(jsonMapper.writeValueAsString(cpf), instruction, history, Revision.CPF_FORMAT);
        JsonNode revised = generation.generate(metadata.path("topic").asString(), Subject.valueOf(metadata.path("subject").asString()),
                GradeLevel.valueOf(metadata.path("gradeLevel").asString()), revision);
        ObjectNode body = jsonMapper.createObjectNode();
        body.put("gameType", GameType.CUSTOM.name());
        body.set("cpf", revised);
        return body;
    }

    @Override
    public ObjectNode toResponse(Game game, ObjectNode management) {
        if (game.getQuestions().size() != 1 || !(game.getQuestions().get(0) instanceof CpfQuestion stored)) {
            throw new ApiException(ErrorCode.INTERNAL_ERROR, "Game CUSTOM phải có đúng một nội dung CPF");
        }
        ObjectNode body = management.deepCopy();
        body.put("gameType", GameType.CUSTOM.name());
        body.set("cpf", jsonMapper.readTree(stored.getPayload()));
        return body;
    }

    private CpfQuestion question(JsonNode cpf) {
        CpfQuestion question = new CpfQuestion();
        question.setItemIndex(0);
        question.setPayload(jsonMapper.writeValueAsString(cpf));
        return question;
    }
}
