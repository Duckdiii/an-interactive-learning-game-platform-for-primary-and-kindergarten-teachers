package com.aigameplatform.backend.service.game;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.service.generation.GameGenerationService;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.testsupport.GameTestFixtures;
import com.aigameplatform.backend.service.validation.GameValidationService;
import java.io.InputStream;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/** Handler DSL với chuỗi kiểm duyệt Lớp 1-2 thật và strategy thật; không gọi AI. */
class DslGameContentHandlerTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private final DslGameContentHandler handler = new DslGameContentHandler(mock(GameGenerationService.class),
            new GameValidationService(GameTestFixtures.schemaAndBusinessRuleValidators(MAPPER), MAPPER),
            new GameContentStrategyRegistry(GameTestFixtures.strategies(MAPPER)), MAPPER);

    private static JsonNode quiz() throws Exception {
        try (InputStream in = DslGameContentHandlerTest.class.getResourceAsStream("/dsl-examples/quiz.json")) {
            return MAPPER.readTree(in);
        }
    }

    private static Game game(GameType type) {
        Game game = new Game();
        game.setGameType(type);
        return game;
    }

    @Test
    void handlesTheTenDslTypesOnly() {
        for (GameType type : GameType.dslTypes()) assertThat(handler.handles(type)).isTrue();
        assertThat(handler.handles(GameType.CUSTOM)).isFalse();
    }

    @Test
    void editReplacesQuestionsAndResponseIsTheFlatEnvelopePlusManagementFields() throws Exception {
        Game game = game(GameType.QUIZ);

        handler.replaceContent(game, quiz());
        JsonNode response = handler.toResponse(game,
                MAPPER.createObjectNode().put("gameId", "g").put("status", "DRAFT").put("updatedAt", "t"));

        assertThat(game.getQuestionNum()).isEqualTo(quiz().path("questions").size());
        assertThat(response.path("gameId").asString()).isEqualTo("g");
        assertThat(response.path("gameType").asString()).isEqualTo("QUIZ");
        assertThat(response.path("questions").size()).isEqualTo(quiz().path("questions").size());
        assertThat(response.has("cpf")).isFalse();
    }

    @Test
    void thePresentationChosenByTheTeacherIsKeptWhenSavedAndRemovedWhenCleared() throws Exception {
        Game game = game(GameType.QUIZ);
        ObjectNode withWorld = (ObjectNode) quiz();
        ((ObjectNode) withWorld.path("metadata")).putObject("presentation").put("world", "space").put("carrier", "planet");

        handler.replaceContent(game, withWorld);
        JsonNode saved = handler.toResponse(game, MAPPER.createObjectNode());

        assertThat(game.getPresentation().getWorld()).isEqualTo("space");
        assertThat(saved.path("metadata").path("presentation").path("world").asString()).isEqualTo("space");
        assertThat(saved.path("metadata").path("presentation").path("carrier").asString()).isEqualTo("planet");
        assertThat(saved.path("metadata").path("presentation").has("layout")).isFalse();

        handler.replaceContent(game, quiz());
        assertThat(handler.toResponse(game, MAPPER.createObjectNode()).path("metadata").has("presentation")).isFalse();
    }

    @Test
    void cannotChangeTheGameType() throws Exception {
        assertThatThrownBy(() -> handler.replaceContent(game(GameType.MATCHING), quiz()))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
    }

    @Test
    void invalidEditIs400() throws Exception {
        ObjectNode broken = (ObjectNode) quiz();
        broken.put("schemaVersion", "9.9.9");

        assertThatThrownBy(() -> handler.replaceContent(game(GameType.QUIZ), broken))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.VALIDATION_ERROR));
    }
}
