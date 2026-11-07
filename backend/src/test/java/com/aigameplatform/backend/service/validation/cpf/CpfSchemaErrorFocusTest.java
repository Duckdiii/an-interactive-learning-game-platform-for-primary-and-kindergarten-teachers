package com.aigameplatform.backend.service.validation.cpf;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.aigameplatform.backend.service.validation.ContentSafetyCheck;
import com.aigameplatform.backend.service.validation.ValidationError;
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import com.aigameplatform.backend.service.validation.safety.ContentModerationClient;
import java.io.InputStream;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Lỗi Lớp 1 của sự kiện/hành động ({@code oneOf} theo type) phải gọn và trỏ đúng nhánh, vì chỉ 10 lỗi đầu được gửi lại AI.
 */
class CpfSchemaErrorFocusTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private final CpfValidationService service = new CpfValidationService(new CpfAssetCatalog(MAPPER),
            new ContentSafetyCheck(new BlockedWordList(List.of("x")), mock(ContentModerationClient.class), false), MAPPER);

    private ObjectNode race() throws Exception {
        try (InputStream in = getClass().getResourceAsStream("/cpf-examples/race-multiplication.json")) {
            return (ObjectNode) MAPPER.readTree(in);
        }
    }

    @Test
    void reportsOnlyTheMissingFieldsOfTheChosenBranches() throws Exception {
        ObjectNode game = race();
        ((ObjectNode) game.get("rules").get(0).get("on")).remove("target");
        ((ObjectNode) game.get("rules").get(0).get("do").get(0)).remove("onWrong");

        List<ValidationError> errors = service.validate(game).errors();

        assertThat(errors).hasSize(2);
        assertThat(errors).anySatisfy(e -> {
            assertThat(e.path()).isEqualTo("$.rules[0].on");
            assertThat(e.message()).contains("target");
        });
        assertThat(errors).anySatisfy(e -> {
            assertThat(e.path()).isEqualTo("$.rules[0].do[0]");
            assertThat(e.message()).contains("onWrong");
        });
    }

    @Test
    void unknownTypeStillGivesOneUsefulError() throws Exception {
        ObjectNode game = race();
        ((ArrayNode) game.get("rules").get(0).get("do")).addObject().put("type", "EXPLODE_3D");

        List<ValidationError> errors = service.validate(game).errors();

        assertThat(errors).isNotEmpty().hasSizeLessThanOrEqualTo(2)
                .allSatisfy(e -> assertThat(e.path()).startsWith("$.rules[0].do[1]"));
    }
}
