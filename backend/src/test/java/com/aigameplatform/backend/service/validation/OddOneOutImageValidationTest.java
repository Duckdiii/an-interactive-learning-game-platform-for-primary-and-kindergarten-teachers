package com.aigameplatform.backend.service.validation;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.dto.dsl.OddOneOutGameDsl;
import com.aigameplatform.backend.service.validation.rule.OddOneOutRule;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class OddOneOutImageValidationTest {
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final SchemaGameValidator validator = new SchemaGameValidator(new GameDslSchemaRegistry(), mapper);

    private ObjectNode input() {
        return (ObjectNode) mapper.readTree("""
                {"schemaVersion":"1.1.0","gameType":"ODD_ONE_OUT","mode":"IMAGE",
                 "metadata":{"title":"Trái cây","subject":"VIETNAMESE","gradeLevel":"GRADE_1","topic":"Trái cây"},
                 "gameplaySettings":{"hitboxScale":1},"questions":[
                  {"id":"q1","timeLimitSeconds":30,"points":10,"questionText":"Hình nào không phải trái cây?",
                   "items":[
                    {"id":"a","text":"Táo","assetId":"apple","imageUrl":"/assets/noto/emoji_u1f34e.svg"},
                    {"id":"b","text":"Chuối","assetId":"banana","imageUrl":"/assets/noto/emoji_u1f34c.svg"},
                    {"id":"c","text":"Nho","assetId":"grapes","imageUrl":"/assets/noto/emoji_u1f347.svg"},
                    {"id":"d","text":"Cà rốt","assetId":"carrot","imageUrl":"/assets/noto/emoji_u1f955.svg"}],
                   "oddOneOutId":"d"}]}
                """);
    }

    @Test
    void imageSchemaAcceptsValidFourItemsAndKeepsV1TextFrozen() {
        var context = new GameValidationContext(input());
        assertThat(validator.validate(context)).isEmpty();
        assertThat(((OddOneOutGameDsl) context.getGame()).questions().getFirst().questionText())
                .isEqualTo("Hình nào không phải trái cây?");
        var oldVersion = input();
        oldVersion.put("schemaVersion", "1.0.0");
        assertThat(validator.validate(new GameValidationContext(oldVersion))).isNotEmpty();
    }

    @Test
    void imageRuleRejectsInventedAssetAndMismatchedUrl() {
        var context = new GameValidationContext(input());
        assertThat(validator.validate(context)).isEmpty();
        assertThat(new OddOneOutRule().check(context.getGame())).isEmpty();
        var bad = input();
        ((ObjectNode) bad.path("questions").get(0).path("items").get(0)).put("assetId", "invented");
        var badContext = new GameValidationContext(bad);
        assertThat(validator.validate(badContext)).isEmpty();
        assertThat(new OddOneOutRule().check(badContext.getGame())).isNotEmpty();
    }

    @Test
    void imageRuleRequiresOneOddCatalogGroupAndCorrectAnswer() {
        var bad = input();
        ((ObjectNode) bad.path("questions").get(0)).put("oddOneOutId", "a");
        var context = new GameValidationContext(bad);
        assertThat(validator.validate(context)).isEmpty();
        assertThat(new OddOneOutRule().check(context.getGame())).isNotEmpty();
    }
}
