package com.aigameplatform.backend.dto.cpf;

import static org.assertj.core.api.Assertions.assertThat;

import com.networknt.schema.Error;
import com.networknt.schema.Schema;
import com.networknt.schema.SchemaRegistry;
import com.networknt.schema.SpecificationVersion;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.function.Consumer;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/** Kiểm JSON Schema CPF Game v2.0.0 (docs/cpf-game-v2.0.0.md) bằng các ví dụ và biến thể sai đúng một chỗ. */
class CpfGameSchemaTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final Schema SCHEMA = loadSchema();
    private static final String BASE = "catch-even-apples";
    private static final String SORT = "sort-land-water-animals";

    private static Schema loadSchema() {
        try (InputStream in = CpfGameSchemaTest.class.getResourceAsStream("/schema/cpf/2.0.0/cpf-game.schema.json")) {
            return SchemaRegistry.withDefaultDialect(SpecificationVersion.DRAFT_2020_12).getSchema(in);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** Mọi file trong cpf-examples/, để thêm ví dụ mới không bị bỏ sót. */
    static Stream<String> exampleNames() throws IOException, URISyntaxException {
        Path dir = Path.of(CpfGameSchemaTest.class.getResource("/cpf-examples").toURI());
        try (Stream<Path> files = Files.list(dir)) {
            List<String> names = files.map(p -> p.getFileName().toString())
                    .filter(n -> n.endsWith(".json")).map(n -> n.substring(0, n.length() - 5)).sorted().toList();
            assertThat(names).hasSizeGreaterThanOrEqualTo(5);
            return names.stream();
        }
    }

    private static JsonNode example(String name) throws IOException {
        try (InputStream in = CpfGameSchemaTest.class.getResourceAsStream("/cpf-examples/" + name + ".json")) {
            return MAPPER.readTree(in);
        }
    }

    private static JsonNode mutated(String name, Consumer<ObjectNode> mutation) throws IOException {
        ObjectNode copy = (ObjectNode) example(name).deepCopy();
        mutation.accept(copy);
        return copy;
    }

    /** Vị trí trong JSON, vị trí trong schema, từ khóa và thông báo của lỗi, để kiểm đúng lý do bị chặn. */
    private static List<String> problems(JsonNode json) {
        return SCHEMA.validate(json).stream().map(CpfGameSchemaTest::describe).toList();
    }

    private static String describe(Error e) {
        return e.getInstanceLocation() + " | " + e.getEvaluationPath() + " | " + e.getKeyword() + " | " + e.getMessage();
    }

    /** Vị trí lỗi trong JSON dạng `/rules/0/on/a`, không phụ thuộc cách in của thư viện. */
    private static String location(Error e) {
        StringBuilder path = new StringBuilder();
        for (int i = 0; i < e.getInstanceLocation().getNameCount(); i++) {
            path.append('/').append(e.getInstanceLocation().getElement(i));
        }
        return path.toString();
    }

    /** Bị chặn và có lỗi nằm ở đúng chỗ đã sửa (hoặc nút cha gần nhất của nó). */
    private static void assertRejectedAt(JsonNode json, String locationPrefix) {
        List<Error> errors = SCHEMA.validate(json);
        assertThat(errors).as("phải bị schema chặn").isNotEmpty();
        assertThat(errors.stream().map(CpfGameSchemaTest::location).toList())
                .as("vị trí lỗi").anySatisfy(loc -> assertThat(loc).startsWith(locationPrefix));
    }

    private static void assertRejectedFor(JsonNode json, String... fragments) {
        List<String> problems = problems(json);
        assertThat(problems).as("phải bị schema chặn").isNotEmpty();
        assertThat(problems).as("lý do bị chặn").anySatisfy(p -> assertThat(p).contains(fragments));
    }

    private static ObjectNode round(ObjectNode game, int index) {
        return (ObjectNode) game.get("content").get("rounds").get(index);
    }

    private static ObjectNode rule(ObjectNode game, int index) {
        return (ObjectNode) game.get("rules").get(index);
    }

    private static ObjectNode entity(ObjectNode game, int index) {
        return (ObjectNode) game.get("entities").get(index);
    }

    private static void addZone(ArrayNode zones, String id, String label) {
        zones.addObject().put("id", id).put("label", label);
    }

    // ---- ví dụ hợp lệ ----

    @ParameterizedTest
    @MethodSource("exampleNames")
    void everyExampleIsValid(String name) throws IOException {
        assertThat(problems(example(name))).isEmpty();
    }

    // ---- vỏ ----

    @Test
    void rejectsUnknownTopLevelField() throws IOException {
        assertRejectedFor(mutated(BASE, g -> g.put("script", "alert(1)")), "additionalProperties");
    }

    @Test
    void rejectsWrongSchemaVersion() throws IOException {
        assertRejectedFor(mutated(BASE, g -> g.put("schemaVersion", "1.0.0")), "schemaVersion");
    }

    @Test
    void rejectsMissingSchemaVersion() throws IOException {
        assertRejectedFor(mutated(BASE, g -> g.remove("schemaVersion")), "required", "schemaVersion");
    }

    // ---- asset ----

    @Test
    void rejectsAssetIdThatIsAUrl() throws IOException {
        assertRejectedFor(mutated(BASE, g -> entity(g, 0).put("assetId", "https://example.com/apple.png")),
                "entities", "pattern");
    }

    @Test
    void rejectsBackgroundFromAnotherGroup() throws IOException {
        assertRejectedFor(mutated(BASE, g -> ((ObjectNode) g.get("world")).put("backgroundId", "fruit.apple")),
                "backgroundId", "pattern");
    }

    @Test
    void rejectsEntityAssetFromUnknownGroup() throws IOException {
        assertRejectedFor(mutated(BASE, g -> entity(g, 0).put("assetId", "weapon.gun")), "entities", "pattern");
    }

    // ---- màn chơi và đáp án ----

    @Test
    void rejectsZonesOnPickRound() throws IOException {
        JsonNode json = mutated(BASE, g -> {
            ArrayNode zones = round(g, 0).putArray("zones");
            addZone(zones, "z1", "A");
            addZone(zones, "z2", "B");
        });
        assertRejectedFor(json, "rounds", "else");
    }

    @Test
    void rejectsSortRoundWithoutZones() throws IOException {
        assertRejectedFor(mutated(SORT, g -> round(g, 0).remove("zones")), "rounds", "zones");
    }

    @Test
    void rejectsAnswerWithBothChoiceIdsAndPlacements() throws IOException {
        JsonNode json = mutated(BASE, g -> {
            ArrayNode placements = ((ObjectNode) g.get("answerKey").get("rounds").get(0)).putArray("placements");
            placements.addObject().put("choiceId", "c1").put("zoneId", "z1");
            placements.addObject().put("choiceId", "c2").put("zoneId", "z2");
        });
        assertRejectedFor(json, "answerKey", "oneOf");
    }

    @Test
    void rejectsDuplicatePlacement() throws IOException {
        JsonNode json = mutated(SORT, g -> {
            ArrayNode placements = (ArrayNode) g.get("answerKey").get("rounds").get(0).get("placements");
            placements.add(placements.get(0).deepCopy());
        });
        assertRejectedFor(json, "placements", "uniqueItems");
    }

    @Test
    void rejectsTooFewChoices() throws IOException {
        JsonNode json = mutated(BASE, g -> {
            ArrayNode choices = (ArrayNode) round(g, 0).get("choices");
            while (choices.size() > 1) choices.remove(choices.size() - 1);
        });
        assertRejectedFor(json, "choices", "minItems");
    }

    // ---- vật ----

    @Test
    void rejectsPixelCoordinatesOnEntity() throws IOException {
        assertRejectedFor(mutated(BASE, g -> entity(g, 0).put("x", 120)), "entities", "additionalProperties");
    }

    @Test
    void rejectsMoreThanTenEntities() throws IOException {
        JsonNode json = mutated(BASE, g -> {
            ArrayNode entities = (ArrayNode) g.get("entities");
            for (int i = 0; i < 9; i++) entities.add(entities.get(1).deepCopy());
        });
        assertRejectedFor(json, "entities", "maxItems");
    }

    @Test
    void rejectsStreamSpawnOnUnboundEntity() throws IOException {
        // Vật "basket" không bindTo: cho nó spawn STREAM là vô nghĩa.
        JsonNode json = mutated(BASE, g -> entity(g, 1).putObject("motion").put("type", "FALL").put("spawn", "STREAM"));
        assertRejectedFor(json, "entities", "bindTo");
    }

    // ---- luật ----

    @Test
    void rejectsActionOutsideCatalog() throws IOException {
        assertRejectedFor(mutated(BASE, g -> ((ArrayNode) rule(g, 0).get("do")).addObject().put("type", "EXPLODE_3D")),
                "rules", "oneOf");
    }

    @Test
    void rejectsNestedCheck() throws IOException {
        JsonNode json = mutated(BASE, g -> {
            ObjectNode nested = ((ArrayNode) rule(g, 0).get("do").get(0).get("onCorrect")).addObject();
            nested.put("type", "CHECK");
            nested.putArray("onCorrect");
            nested.putArray("onWrong");
        });
        assertRejectedFor(json, "onCorrect", "oneOf");
    }

    @Test
    void rejectsSubjectPlaceholderAsCollideTrigger() throws IOException {
        assertRejectedAt(mutated(BASE, g -> ((ObjectNode) rule(g, 0).get("on")).put("a", "$subject")), "/rules/0/on");
    }

    @Test
    void rejectsSubjectPlaceholderAsTapTarget() throws IOException {
        assertRejectedAt(mutated("race-multiplication", g -> ((ObjectNode) rule(g, 0).get("on")).put("target", "$subject")),
                "/rules/0/on");
    }

    @Test
    void rejectsUnknownPlaceholder() throws IOException {
        assertRejectedAt(mutated(BASE, g -> ((ObjectNode) rule(g, 0).get("do").get(1)).put("subject", "$tapped")),
                "/rules/0/do/1");
    }

    @Test
    void rejectsNextRoundAction() throws IOException {
        // Runtime tự chuyển màn (docs mục 3.7); để AI chèn NEXT_ROUND sẽ bỏ qua màn.
        assertRejectedAt(mutated(BASE, g -> ((ArrayNode) rule(g, 0).get("do")).addObject().put("type", "NEXT_ROUND")),
                "/rules/0/do/2");
    }

    // ---- id và độ dài ----

    @Test
    void rejectsChoiceIdBeyondEight() throws IOException {
        assertRejectedAt(mutated(BASE, g -> ((ObjectNode) round(g, 0).get("choices").get(0)).put("id", "c9")),
                "/content/rounds/0/choices/0/id");
    }

    @Test
    void rejectsZoneIdBeyondFour() throws IOException {
        assertRejectedAt(mutated(SORT, g -> ((ObjectNode) round(g, 0).get("zones").get(0)).put("id", "z5")),
                "/content/rounds/0/zones/0/id");
    }

    @Test
    void rejectsRoundIdZero() throws IOException {
        assertRejectedAt(mutated(BASE, g -> round(g, 0).put("id", "r0")), "/content/rounds/0/id");
    }

    @Test
    void rejectsLabelLongerThanThirty() throws IOException {
        assertRejectedAt(mutated(BASE, g -> ((ObjectNode) round(g, 0).get("choices").get(0)).put("label", "x".repeat(31))),
                "/content/rounds/0/choices/0/label");
    }

    @Test
    void rejectsPromptLongerThan120() throws IOException {
        assertRejectedAt(mutated(BASE, g -> round(g, 0).put("prompt", "x".repeat(121))), "/content/rounds/0/prompt");
    }

    @Test
    void rejectsChoiceAssetFromUnknownGroup() throws IOException {
        assertRejectedAt(mutated(SORT, g -> ((ObjectNode) round(g, 0).get("choices").get(0)).put("assetId", "photo.cat")),
                "/content/rounds/0/choices/0/assetId");
    }

    @Test
    void rejectsUnknownTask() throws IOException {
        assertRejectedAt(mutated(BASE, g -> round(g, 0).put("task", "ORDER")), "/content/rounds/0/task");
    }

    @Test
    void rejectsUnknownGradeLevel() throws IOException {
        assertRejectedAt(mutated(BASE, g -> ((ObjectNode) g.get("metadata")).put("gradeLevel", "GRADE_6")),
                "/metadata/gradeLevel");
    }

    @Test
    void rejectsAnswerWithNeitherChoiceIdsNorPlacements() throws IOException {
        assertRejectedAt(mutated(BASE, g -> ((ObjectNode) g.get("answerKey").get("rounds").get(0)).remove("correctChoiceIds")),
                "/answerKey/rounds/0");
    }

    @Test
    void rejectsDuplicateCorrectChoiceIds() throws IOException {
        assertRejectedAt(mutated(BASE, g -> ((ArrayNode) g.get("answerKey").get("rounds").get(0).get("correctChoiceIds"))
                .add("c1")), "/answerKey/rounds/0/correctChoiceIds");
    }

    @Test
    void rejectsScoreOutOfRange() throws IOException {
        assertRejectedFor(mutated(BASE, g -> ((ObjectNode) rule(g, 0).get("do").get(0).get("onCorrect").get(2))
                .put("add", 100)), "onCorrect", "oneOf");
    }
}
