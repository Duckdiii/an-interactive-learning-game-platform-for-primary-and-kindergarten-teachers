package com.aigameplatform.backend.service.validation.cpf;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.service.validation.ContentSafetyCheck;
import com.aigameplatform.backend.service.validation.ValidationError;
import com.aigameplatform.backend.service.validation.safety.ModerationUnavailableException;
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import com.aigameplatform.backend.service.validation.safety.ContentModerationClient;
import com.aigameplatform.backend.service.validation.safety.ModerationResult;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.function.Consumer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/** Chuỗi kiểm duyệt CPF 3 lớp (docs/cpf-game-v2.0.0.md mục 4). Mỗi biến thể sai chỉ sai một chỗ. */
class CpfValidationServiceTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final String CATCH = "catch-even-apples";
    private static final String RACE = "race-multiplication";
    private static final String FISH = "fishing-compound-words";
    private static final String ARCHERY = "archery-addition";
    private static final String SORT = "sort-land-water-animals";
    private static final String RABBIT = "rabbit-pick-carrots";

    private final ContentModerationClient moderation = mock(ContentModerationClient.class);
    private final CpfValidationService service = new CpfValidationService(new CpfAssetCatalog(MAPPER),
            new ContentSafetyCheck(new BlockedWordList(List.of("cứt")), moderation, false), MAPPER);

    private static ObjectNode example(String name) throws IOException {
        try (InputStream in = CpfValidationServiceTest.class.getResourceAsStream("/cpf-examples/" + name + ".json")) {
            return (ObjectNode) MAPPER.readTree(in);
        }
    }

    private static JsonNode mutated(String name, Consumer<ObjectNode> mutation) throws IOException {
        ObjectNode game = example(name);
        mutation.accept(game);
        return game;
    }

    private static ObjectNode round(ObjectNode game, int i) {
        return (ObjectNode) game.get("content").get("rounds").get(i);
    }

    private static ObjectNode answer(ObjectNode game, int i) {
        return (ObjectNode) game.get("answerKey").get("rounds").get(i);
    }

    private static ObjectNode entity(ObjectNode game, int i) {
        return (ObjectNode) game.get("entities").get(i);
    }

    private static ObjectNode rule(ObjectNode game, int i) {
        return (ObjectNode) game.get("rules").get(i);
    }

    private List<ValidationError> errorsOf(JsonNode json) {
        return service.validate(json).errors();
    }

    private void assertRejectedAt(JsonNode json, String pathPrefix, String messagePart) {
        assertThat(errorsOf(json)).as("phải bị chặn tại " + pathPrefix)
                .anySatisfy(e -> {
                    assertThat(e.path()).startsWith(pathPrefix);
                    assertThat(e.message()).contains(messagePart);
                });
    }

    /** Biến thể chỉ sai đúng một chỗ: phải có đúng một lỗi, ở đúng vị trí. */
    private void assertOnlyError(JsonNode json, String pathPrefix, String messagePart) {
        List<ValidationError> errors = errorsOf(json);
        assertThat(errors).as("chỉ một lỗi: " + errors).hasSize(1);
        assertRejectedAt(json, pathPrefix, messagePart);
    }

    // ---- ví dụ hợp lệ ----

    @ParameterizedTest
    @ValueSource(strings = {CATCH, RACE, FISH, ARCHERY, SORT, RABBIT})
    void everyExamplePassesAllThreeLayers(String name) throws IOException {
        var report = service.validate(example(name));
        assertThat(report.errors()).isEmpty();
        assertThat(report.game()).isNotNull();
    }

    @Test
    void assetCatalogLoadsInFileOrder() {
        CpfAssetCatalog catalog = new CpfAssetCatalog(MAPPER);
        assertThat(catalog.ids()).contains("bg.farm", "bg.road", "object.basket").hasSizeGreaterThan(40);
        assertThat(catalog.labels().keySet()).first().isEqualTo("bg.farm");
    }

    // ---- Lớp 1 chặn trước, Lớp 2 không chạy ----

    @Test
    void schemaErrorStopsTheChain() throws IOException {
        // Sai cả Lớp 1 (phiên bản) lẫn Lớp 2 (trùng id vật): chỉ được thấy lỗi Lớp 1.
        List<ValidationError> errors = errorsOf(mutated(CATCH, g -> {
            g.put("schemaVersion", "1.0.0");
            entity(g, 1).put("id", "apples");
        }));
        assertThat(errors).isNotEmpty().allSatisfy(e -> assertThat(e.path()).startsWith("$.schemaVersion"));
    }

    @Test
    void rejectsNonJson() {
        assertThat(service.validate("không phải json").valid()).isFalse();
    }

    // ---- Lớp 2: chung, id, đáp án ----

    @Test
    void rejectsBlankText() throws IOException {
        assertRejectedAt(mutated(CATCH, g -> round(g, 0).put("prompt", "   ")), "$.content.rounds[0].prompt", "trống");
    }

    @Test
    void rejectsDuplicateLabelIgnoringCaseAndSpaces() throws IOException {
        assertRejectedAt(mutated(FISH, g -> ((ObjectNode) round(g, 0).get("choices").get(1)).put("label", "  Xe   đạp ")),
                "$.content.rounds[0].choices[1].label", "Trùng nhãn");
    }

    @Test
    void labelsDifferingOnlyByDiacriticsAreNotDuplicates() throws IOException {
        JsonNode json = mutated(FISH, g -> ((ObjectNode) round(g, 0).get("choices").get(1)).put("label", "xe dap"));
        assertThat(errorsOf(json)).noneSatisfy(e -> assertThat(e.message()).contains("Trùng nhãn"));
    }

    @Test
    void rejectsDuplicateEntityId() throws IOException {
        // Thêm một bản sao của giỏ cùng id: luật vẫn trỏ tới "basket" hợp lệ, chỉ còn lỗi trùng id.
        assertOnlyError(mutated(CATCH, g -> ((ArrayNode) g.get("entities")).add(entity(g, 1).deepCopy())),
                "$.entities[2].id", "Trùng id vật");
    }

    @Test
    void rejectsAnswerKeyOfWrongLength() throws IOException {
        assertRejectedAt(mutated(CATCH, g -> ((ArrayNode) g.get("answerKey").get("rounds")).remove(1)),
                "$.answerKey.rounds", "đúng 2 phần tử");
    }

    @Test
    void rejectsAnswerForAnotherRound() throws IOException {
        assertRejectedAt(mutated(CATCH, g -> answer(g, 0).put("roundId", "r2")), "$.answerKey.rounds[0].roundId", "r1");
    }

    @Test
    void rejectsCorrectChoiceThatDoesNotExist() throws IOException {
        assertRejectedAt(mutated(CATCH, g -> ((ArrayNode) answer(g, 1).get("correctChoiceIds")).set(0, "c8")),
                "$.answerKey.rounds[1].correctChoiceIds[0]", "Không có lựa chọn");
    }

    @Test
    void rejectsPickOneWithTwoAnswers() throws IOException {
        assertRejectedAt(mutated(FISH, g -> ((ArrayNode) answer(g, 0).get("correctChoiceIds")).add("c2")),
                "$.answerKey.rounds[0].correctChoiceIds", "đúng 1 đáp án");
    }

    @Test
    void rejectsPickAllWhereEveryChoiceIsCorrect() throws IOException {
        JsonNode json = mutated(CATCH, g -> {
            ArrayNode ids = ((ObjectNode) answer(g, 1)).putArray("correctChoiceIds");
            List.of("c1", "c2", "c3", "c4").forEach(ids::add);
        });
        assertRejectedAt(json, "$.answerKey.rounds[1].correctChoiceIds", "ít đáp án đúng hơn");
    }

    @Test
    void rejectsSortRoundAnsweredWithChoiceIds() throws IOException {
        JsonNode json = mutated(SORT, g -> {
            answer(g, 0).remove("placements");
            answer(g, 0).putArray("correctChoiceIds").add("c1");
        });
        assertRejectedAt(json, "$.answerKey.rounds[0]", "placements");
    }

    @Test
    void rejectsSortWithAChoiceLeftWithoutZone() throws IOException {
        assertRejectedAt(mutated(SORT, g -> ((ArrayNode) answer(g, 0).get("placements")).remove(3)),
                "$.answerKey.rounds[0].placements", "Mọi lựa chọn");
    }

    @Test
    void rejectsWrongArithmeticAnswer() throws IOException {
        // 3 + 4 = 7 nhưng đáp án đánh dấu là "6".
        assertRejectedAt(mutated(ARCHERY, g -> ((ArrayNode) answer(g, 0).get("correctChoiceIds")).set(0, "c1")),
                "$.answerKey.rounds[0].correctChoiceIds", "không khớp kết quả");
    }

    // ---- Lớp 2: asset ----

    @Test
    void rejectsAssetOutsideCatalog() throws IOException {
        assertRejectedAt(mutated(CATCH, g -> entity(g, 0).put("assetId", "fruit.dragonfruit")),
                "$.entities[0].assetId", "danh mục");
    }

    @Test
    void rejectsChoiceAssetOutsideCatalog() throws IOException {
        assertRejectedAt(mutated(SORT, g -> ((ObjectNode) round(g, 0).get("choices").get(0)).put("assetId", "animal.unicorn")),
                "$.content.rounds[0].choices[0].assetId", "danh mục");
    }

    // ---- Lớp 2: tham chiếu và khả năng chơi ----

    @Test
    void rejectsTriggerOnUnknownEntity() throws IOException {
        assertOnlyError(mutated(RACE, g -> ((ObjectNode) rule(g, 0).get("on")).put("target", "bananas")),
                "$.rules[0].on.target", "Không có vật");
    }

    @Test
    void rejectsActionOnUnknownEntity() throws IOException {
        assertRejectedAt(mutated(FISH, g -> ((ObjectNode) rule(g, 0).get("do").get(0).get("onCorrect").get(0)).put("to", "net")),
                "$.rules[0].do[0].onCorrect[0].to", "Không có vật");
    }

    @Test
    void rejectsCheckOnRoundStart() throws IOException {
        JsonNode json = mutated(RACE, g -> ((ObjectNode) rule(g, 0).get("on")).removeAll().put("type", "ROUND_START"));
        assertRejectedAt(json, "$.rules[0]", "CHECK và $subject");
        assertThat(errorsOf(json)).filteredOn(e -> e.path().equals("$.rules[0]")).hasSize(1);
    }

    @Test
    void rejectsPickGameWithoutAnyCheck() throws IOException {
        JsonNode json = mutated(FISH, g -> {
            ArrayNode actions = rule(g, 0).putArray("do");
            actions.addObject().put("type", "SOUND").put("name", "POP");
        });
        assertOnlyError(json, "$.rules", "Màn PICK_* cần");
    }

    @Test
    void rejectsCollideWithoutAControlledEntity() throws IOException {
        assertOnlyError(mutated(CATCH, g -> entity(g, 1).remove("control")), "$.rules[0].on", "COLLIDE cần đúng một vật");
    }

    @Test
    void rejectsBasketCatchingThingsThatDoNotFall() throws IOException {
        JsonNode json = mutated(CATCH, g -> ((ObjectNode) entity(g, 0).get("motion")).put("type", "PATROL_X"));
        assertRejectedAt(json, "$.rules[0].on", "motion FALL");
    }

    @Test
    void rejectsDropItemThatCannotBeDragged() throws IOException {
        assertRejectedAt(mutated(SORT, g -> entity(g, 0).remove("control")), "$.rules[0].on.item", "DRAG_FREE");
    }

    @Test
    void rejectsAimShootWithoutCollide() throws IOException {
        JsonNode json = mutated(ARCHERY, g -> {
            ObjectNode on = (ObjectNode) rule(g, 0).get("on");
            on.removeAll();
            on.put("type", "TAP").put("target", "targets");
        });
        assertRejectedAt(json, "$.entities[0]", "AIM_SHOOT");
    }

    @Test
    void rejectsAdvanceOutsideOnCorrect() throws IOException {
        JsonNode json = mutated(RACE, g -> ((ArrayNode) rule(g, 0).get("do").get(0).get("onWrong"))
                .addObject().put("type", "ADVANCE").put("subject", "car"));
        assertRejectedAt(json, "$.rules[0].do[0].onWrong[2]", "onCorrect");
    }

    @Test
    void rejectsAdvanceOnNonProgressEntity() throws IOException {
        JsonNode json = mutated(RACE, g -> ((ObjectNode) rule(g, 0).get("do").get(0).get("onCorrect").get(0)).put("subject", "signs"));
        assertRejectedAt(json, "$.rules[0].do[0].onCorrect[0].subject", "PROGRESS");
    }

    @Test
    void rejectsProgressGameWithPickAllRound() throws IOException {
        JsonNode json = mutated(RACE, g -> {
            round(g, 0).put("task", "PICK_ALL");
            ((ArrayNode) answer(g, 0).get("correctChoiceIds")).removeAll();
            ((ArrayNode) answer(g, 0).get("correctChoiceIds")).add("c2");
        });
        assertRejectedAt(json, "$.content.rounds", "PICK_ONE");
    }

    @Test
    void rejectsBoundEntityStackedOnOneSpot() throws IOException {
        JsonNode json = mutated(FISH, g -> ((ObjectNode) entity(g, 0).get("placement")).put("arrangement", "SINGLE"));
        assertRejectedAt(json, "$.entities[0].placement.arrangement", "SINGLE");
    }

    @Test
    void rejectsTooManyVisibleEntities() throws IOException {
        // Vẫn ≤ 10 khai báo (Lớp 1 cho qua), nhưng 3 nhóm táo × 5 lựa chọn + giỏ = 16 vật cùng lúc.
        JsonNode json = mutated(CATCH, g -> {
            ArrayNode entities = (ArrayNode) g.get("entities");
            for (int i = 0; i < 2; i++) {
                ObjectNode copy = (ObjectNode) entities.get(0).deepCopy();
                copy.put("id", "more_apples" + i);
                entities.add(copy);
            }
        });
        assertRejectedAt(json, "$.entities", "Quá nhiều vật");
    }

    // ---- Lớp 3 ----

    @Test
    void rejectsBlockedWordAsUnsafeWithoutCallingModeration() throws IOException {
        when(moderation.isConfigured()).thenReturn(true);
        var report = service.validate(mutated(FISH, g -> ((ObjectNode) round(g, 0).get("choices").get(1)).put("label", "cứt")));
        assertThat(report.unsafe()).isTrue();
        verify(moderation, never()).moderate(anyList());
    }

    @Test
    void sendsOnlyReadableTextsToModeration() throws IOException {
        when(moderation.isConfigured()).thenReturn(true);
        when(moderation.moderate(anyList())).thenAnswer(inv -> ((List<?>) inv.getArgument(0)).stream()
                .map(t -> new ModerationResult(false, List.of())).toList());

        assertThat(service.validate(example(SORT)).valid()).isTrue();
        verify(moderation).moderate(List.of("Con vật ở đâu?", "Con vật sống trên cạn và dưới nước",
                "Kéo mỗi con vật về đúng nhà của nó nhé!", "Con nào sống trên cạn, con nào sống dưới nước?",
                "con mèo", "con cá", "con chó", "con rùa biển", "Trên cạn", "Dưới nước"));
    }

    // ---- thêm: luật chưa có test ----

    @Test
    void catcherAtTheTopNeedsThingsFloatingUp() throws IOException {
        JsonNode json = mutated(CATCH, g -> ((ObjectNode) entity(g, 1).get("placement")).put("region", "TOP"));
        assertOnlyError(json, "$.rules[0].on", "motion FLOAT_UP");
    }

    @Test
    void catcherAtTheTopWithFloatingThingsIsValid() throws IOException {
        JsonNode json = mutated(CATCH, g -> {
            ((ObjectNode) entity(g, 1).get("placement")).put("region", "TOP");
            ((ObjectNode) entity(g, 0).get("placement")).put("region", "BOTTOM");
            ((ObjectNode) entity(g, 0).get("motion")).put("type", "FLOAT_UP");
        });
        assertThat(errorsOf(json)).isEmpty();
    }

    @Test
    void rejectsCatcherInTheMiddle() throws IOException {
        assertOnlyError(mutated(CATCH, g -> ((ObjectNode) entity(g, 1).get("placement")).put("region", "MIDDLE")),
                "$.rules[0].on", "TOP hoặc BOTTOM");
    }

    @Test
    void rejectsTapOnAControlledEntity() throws IOException {
        JsonNode json = mutated(RACE, g -> {
            entity(g, 0).put("control", "DRAG_FREE");
            ((ObjectNode) rule(g, 0).get("on")).put("target", "car");
        });
        assertRejectedAt(json, "$.rules[0].on.target", "đang điều khiển");
    }

    @Test
    void rejectsZonesBoundEntityWithoutSortRound() throws IOException {
        JsonNode json = mutated(FISH, g -> ((ArrayNode) g.get("entities")).addObject()
                .put("id", "homes").put("assetId", "object.box").put("bindTo", "zones")
                .putObject("placement").put("region", "BOTTOM").put("arrangement", "ROW"));
        assertOnlyError(json, "$.entities[2].bindTo", "SORT");
    }

    @Test
    void rejectsDropIntoNonZoneEntity() throws IOException {
        assertRejectedAt(mutated(SORT, g -> entity(g, 1).remove("bindTo")), "$.rules[0].on.zone", "bindTo: zones");
    }

    @Test
    void rejectsMusicBecauseCatalogHasNoMusicYet() throws IOException {
        assertOnlyError(mutated(CATCH, g -> ((ObjectNode) g.get("world")).put("musicId", "music.happy")),
                "$.world.musicId", "danh mục");
    }

    @Test
    void rejectsSubjectInRoundStartRule() throws IOException {
        JsonNode json = mutated(FISH, g -> {
            ObjectNode newRule = ((ArrayNode) g.get("rules")).addObject();
            newRule.putObject("on").put("type", "ROUND_START");
            newRule.putArray("do").addObject().put("type", "MOVE_TO").put("subject", "$subject").put("to", "boat");
        });
        assertOnlyError(json, "$.rules[1]", "CHECK và $subject");
    }

    // ---- toán: chỉ kiểm câu hỏi kết quả phép tính ----

    @Test
    void trueFalseQuestionWithArithmeticIsNotRejected() throws IOException {
        JsonNode json = mutated(ARCHERY, g -> {
            round(g, 0).put("prompt", "3 + 4 = 8. Đúng hay sai?");
            ArrayNode choices = round(g, 0).putArray("choices");
            choices.addObject().put("id", "c1").put("label", "Đúng");
            choices.addObject().put("id", "c2").put("label", "Sai");
            answer(g, 0).putArray("correctChoiceIds").add("c2");
        });
        assertThat(errorsOf(json)).isEmpty();
    }

    @Test
    void answersWithUnitsAreNotRejected() throws IOException {
        JsonNode json = mutated(ARCHERY, g -> {
            ArrayNode choices = (ArrayNode) round(g, 0).get("choices");
            for (int i = 0; i < choices.size(); i++) {
                ObjectNode c = (ObjectNode) choices.get(i);
                c.put("label", c.get("label").asString() + " quả");
            }
        });
        assertThat(errorsOf(json)).isEmpty();
    }

    @Test
    void comparisonQuestionIsNotForcedToTheSum() throws IOException {
        // "Số nào lớn hơn 3 + 4?" có đáp án 8 (c3), không phải tổng 7: không được chặn nhầm.
        JsonNode json = mutated(ARCHERY, g -> {
            round(g, 0).put("prompt", "Số nào lớn hơn 3 + 4?");
            ((ArrayNode) answer(g, 0).get("correctChoiceIds")).set(0, "c3");
        });
        assertThat(errorsOf(json)).isEmpty();
    }

    // ---- Lớp 3 qua chuỗi CPF ----

    @Test
    void moderationOutageIsReportedAsUnavailable() throws IOException {
        when(moderation.isConfigured()).thenReturn(true);
        when(moderation.moderate(anyList())).thenThrow(new ModerationUnavailableException("timeout"));
        var report = service.validate(example(FISH));
        assertThat(report.unavailable()).isTrue();
        assertThat(report.unsafe()).isFalse();
    }

    @Test
    void flaggedTextIsUnsafeAtItsPath() throws IOException {
        when(moderation.isConfigured()).thenReturn(true);
        when(moderation.moderate(anyList())).thenAnswer(inv -> {
            List<?> texts = inv.getArgument(0);
            return java.util.stream.IntStream.range(0, texts.size())
                    .mapToObj(i -> new ModerationResult(i == 0, i == 0 ? List.of("violence") : List.<String>of())).toList();
        });
        var report = service.validate(example(FISH));
        assertThat(report.unsafe()).isTrue();
        assertThat(report.errors()).singleElement().satisfies(e -> assertThat(e.path()).isEqualTo("$.metadata.title"));
    }

    @Test
    void layerTwoErrorDoesNotCallModeration() throws IOException {
        when(moderation.isConfigured()).thenReturn(true);
        service.validate(mutated(CATCH, g -> entity(g, 0).put("assetId", "fruit.dragonfruit")));
        verify(moderation, never()).moderate(anyList());
    }

    // ---- đáp án thay đổi giữa các màn, nhãn là phép tính ----

    private static void choiceLabel(ObjectNode game, int round, int choice, String label) {
        ((ObjectNode) round(game, round).get("choices").get(choice)).put("label", label);
    }

    @Test
    void rejectsTheSameCorrectAnswerInEveryRound() throws IOException {
        assertOnlyError(mutated(RACE, g -> {
            for (int i = 0; i < 3; i++) round(g, i).put("prompt", "Tìm số tám");
            answer(g, 0).set("correctChoiceIds", MAPPER.createArrayNode().add("c3"));
            choiceLabel(g, 1, 0, "8");
        }), "$.answerKey.rounds", "cùng đáp án");
    }

    @Test
    void acceptsExpressionLabelsWhoseMarkedChoiceEqualsTheTarget() throws IOException {
        JsonNode json = mutated(RACE, g -> {
            round(g, 0).put("prompt", "Phép nhân nào bằng 6?");
            choiceLabel(g, 0, 0, "2 x 2");
            choiceLabel(g, 0, 1, "2 x 3");
            choiceLabel(g, 0, 2, "2 x 4");
        });
        assertThat(errorsOf(json)).isEmpty();
    }

    @Test
    void comparisonPromptIsNotTreatedAsASingleTarget() throws IOException {
        JsonNode json = mutated(RACE, g -> {
            round(g, 0).put("prompt", "Phép nhân nào lớn hơn hoặc bằng 6?");
            choiceLabel(g, 0, 0, "2 x 2");
            choiceLabel(g, 0, 1, "2 x 4");
            choiceLabel(g, 0, 2, "2 x 1");
        });
        assertThat(errorsOf(json)).isEmpty();
    }

    @Test
    void rejectsExpressionLabelsWhenTheMarkedChoiceMissesTheTarget() throws IOException {
        assertOnlyError(mutated(RACE, g -> {
            round(g, 0).put("prompt", "Phép nhân nào bằng 6?");
            choiceLabel(g, 0, 0, "2 x 2");
            choiceLabel(g, 0, 1, "2 x 3");
            choiceLabel(g, 0, 2, "2 x 4");
            answer(g, 0).set("correctChoiceIds", MAPPER.createArrayNode().add("c1"));
        }), "$.answerKey.rounds[0].correctChoiceIds", "không cho kết quả 6");
    }

    // ---- khối Đợt 5: chuyển động mới, TAP_MOVE ----

    @Test
    void catcherAtTheTopAlsoCatchesSwayingBalloons() throws IOException {
        JsonNode json = mutated(CATCH, g -> {
            ((ObjectNode) entity(g, 1).get("placement")).put("region", "TOP");
            ((ObjectNode) entity(g, 0).get("placement")).put("region", "BOTTOM");
            ((ObjectNode) entity(g, 0).get("motion")).put("type", "SWAY_UP");
        });
        assertThat(errorsOf(json)).isEmpty();
    }

    @Test
    void rejectsTapMoveTargetsThatLeaveTheScreen() throws IOException {
        JsonNode json = mutated(RABBIT, g -> ((ObjectNode) entity(g, 0).get("motion")).put("type", "FALL"));
        assertOnlyError(json, "$.rules[0].on", "ở lại trên màn");
    }

    @Test
    void rejectsTapMoveCharacterStartingOnTheChoices() throws IOException {
        JsonNode json = mutated(RABBIT, g -> ((ObjectNode) entity(g, 1).get("placement")).put("region", "TOP"));
        assertOnlyError(json, "$.rules[0].on", "hai vùng khác nhau");
    }

    @Test
    void rejectsTapRuleInATapMoveGame() throws IOException {
        JsonNode json = mutated(RABBIT, g -> {
            ObjectNode tap = ((ArrayNode) g.get("rules")).addObject();
            tap.putObject("on").put("type", "TAP").put("target", "carrots");
            tap.putArray("do").addObject().put("type", "SOUND").put("name", "POP");
        });
        assertOnlyError(json, "$.rules", "không dùng luật TAP");
    }

    @Test
    void rejectsSecondTapMoveCharacter() throws IOException {
        JsonNode json = mutated(RABBIT, g -> {
            ObjectNode second = entity(g, 1).deepCopy();
            second.put("id", "rabbit_two");
            ((ObjectNode) second.get("placement")).put("region", "MIDDLE");
            ((ArrayNode) g.get("entities")).add(second);
        });
        assertRejectedAt(json, "$.entities", "Chỉ được một vật TAP_MOVE");
    }

    @Test
    void rejectsTapMoveWithoutCollide() throws IOException {
        JsonNode json = mutated(RABBIT, g -> {
            ObjectNode on = (ObjectNode) rule(g, 0).get("on");
            on.removeAll();
            on.put("type", "TAP").put("target", "carrots");
        });
        assertRejectedAt(json, "$.entities[1]", "TAP_MOVE cần một luật COLLIDE");
    }

    @Test
    void rejectsOrbitingOrCrossingThingsArrivingInAStream() throws IOException {
        JsonNode json = mutated(RABBIT, g -> ((ObjectNode) entity(g, 0).get("motion")).put("type", "ORBIT").put("spawn", "STREAM"));
        assertOnlyError(json, "$.entities[0].motion.spawn", "ALL_AT_ONCE");
    }

    @Test
    void rejectsFastThingsForKindergarten() throws IOException {
        JsonNode json = mutated(RABBIT, g -> ((ObjectNode) entity(g, 0).get("motion")).put("speed", "FAST"));
        assertOnlyError(json, "$.entities[0].motion.speed", "Mầm non");
    }

    @Test
    void fastThingsAreFineAboveKindergarten() throws IOException {
        JsonNode json = mutated(RABBIT, g -> {
            ((ObjectNode) g.get("metadata")).put("gradeLevel", "GRADE_1");
            ((ObjectNode) entity(g, 0).get("motion")).put("speed", "FAST");
        });
        assertThat(errorsOf(json)).isEmpty();
    }

    @Test
    void rejectsTapMoveBoundToChoices() throws IOException {
        JsonNode json = mutated(RABBIT, g -> entity(g, 1).put("bindTo", "choices").putObject("placement").put("region", "BOTTOM").put("arrangement", "ROW"));
        assertRejectedAt(json, "$.entities[1].bindTo", "không dùng bindTo");
    }

    @Test
    void rejectsFastTargetsForAimShoot() throws IOException {
        JsonNode json = mutated(ARCHERY, g -> ((ObjectNode) entity(g, 1).get("motion")).put("type", "ORBIT").put("speed", "FAST"));
        assertOnlyError(json, "$.rules[0].on", "không chạy FAST");
    }

    @Test
    void rejectsTapMoveCharacterThatMovesOnItsOwn() throws IOException {
        JsonNode json = mutated(RABBIT, g -> entity(g, 1).putObject("motion").put("type", "PATROL_X"));
        assertOnlyError(json, "$.entities[1].motion", "TAP_MOVE không có motion");
    }

    @Test
    void rejectsBowShootingSidewaysIntoARowOfTargets() throws IOException {
        JsonNode json = mutated(ARCHERY, g -> {
            ((ObjectNode) entity(g, 0).get("placement")).put("region", "LEFT");
            ((ObjectNode) entity(g, 1).get("placement")).put("region", "RIGHT");
        });
        assertOnlyError(json, "$.rules[0].on", "BOTTOM hoặc TOP");
    }

    @Test
    void rejectsTargetsStackedInAGridInFrontOfTheBow() throws IOException {
        JsonNode json = mutated(ARCHERY, g -> ((ObjectNode) entity(g, 1).get("placement")).put("arrangement", "GRID"));
        assertOnlyError(json, "$.rules[0].on", "GRID");
    }
}
