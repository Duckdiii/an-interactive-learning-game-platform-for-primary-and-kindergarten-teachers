package com.aigameplatform.backend.service.asset.binding;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.service.asset.KeywordAssetRetriever;
import com.aigameplatform.backend.service.asset.concept.ConceptGraph;
import com.aigameplatform.backend.service.factory.GameAssetCatalog;
import com.aigameplatform.backend.service.testsupport.GameAssetCatalogFixture;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class GameAssetBinderTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private static final GameAssetCatalog CATALOG = GameAssetCatalogFixture.ASSETS;

    private GameAssetBinder binder;

    @BeforeEach
    void setUp() {
        LabelLookupResolver labelResolver = new LabelLookupResolver(new KeywordAssetRetriever(CATALOG), CATALOG);
        ConceptGraphResolver conceptResolver = new ConceptGraphResolver(new ConceptGraph(MAPPER, CATALOG), CATALOG);
        StyleLockPolicy styleLock = new StyleLockPolicy(true, 0.5);
        CellExtractor extractor = new CellExtractor();
        binder = new GameAssetBinder(extractor, List.of(labelResolver, conceptResolver), styleLock, CATALOG);
    }

    private static JsonNode parse(String json) {
        try {
            return MAPPER.readTree(json);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void oddOneOutIsNotTouched() {
        String json = """
                {
                  "questions": [
                    {
                      "items": ["con chó", "con mèo", "cái ghế"],
                      "oddOneOutIndex": 2,
                      "audioText": "Tìm từ khác loại"
                    }
                  ]
                }
                """;
        BindingResult result = binder.bind(parse(json), BindMode.FILL_EMPTY);
        assertThat(result.decisions()).isEmpty();
        assertThat(result.output().toString()).isEqualTo(parse(json).toString());
    }

    @Test
    void doesNotTouchOptions() {
        // Options chứa "con voi", "con cá", nhưng text câu hỏi là con mèo -> phải gán hình mèo, không bị dính voi/cá
        String json = """
                {
                  "questions": [
                    {
                      "text": "Con mèo trèo cây cau",
                      "options": ["con voi", "con cá heo", "con sư tử"],
                      "correctIndex": 0
                    }
                  ]
                }
                """;
        BindingResult result = binder.bind(parse(json), BindMode.FILL_EMPTY);
        assertThat(result.decisions()).hasSize(1);
        AssetDecision decision = result.decisions().getFirst();
        assertThat(decision.hasAsset()).isTrue();
        assertThat(decision.chosen().orElseThrow().label()).isEqualTo("Con mèo");
        assertThat(result.output().at("/questions/0/asset").asString()).isEqualTo(decision.assetId());
    }

    @Test
    void strangeIdIsReplaced() {
        String json = """
                {
                  "questions": [
                    {
                      "text": "Đây là con gì?",
                      "visualPrompt": "con mèo",
                      "asset": "khong-co-hinh-nay-trong-danh-muc"
                    }
                  ]
                }
                """;
        BindingResult result = binder.bind(parse(json), BindMode.FILL_EMPTY);
        assertThat(result.decisions()).hasSize(1);
        AssetDecision decision = result.decisions().getFirst();
        assertThat(decision.hasAsset()).isTrue();
        assertThat(decision.chosen().orElseThrow().label()).isEqualTo("Con mèo");
        assertThat(result.output().at("/questions/0/asset").asString()).isNotEqualTo("khong-co-hinh-nay-trong-danh-muc");
        assertThat(result.output().at("/questions/0/asset").asString()).isEqualTo(decision.assetId());
    }

    @Test
    void countingThreeDucksIsResolved() {
        String json = """
                {
                  "questions": [
                    {
                      "text": "Có mấy con vịt?",
                      "options": ["2", "3", "4"],
                      "correctIndex": 1,
                      "visualPrompt": "3 con vịt"
                    }
                  ]
                }
                """;
        BindingResult result = binder.bind(parse(json), BindMode.FILL_EMPTY);
        assertThat(result.decisions()).hasSize(1);
        AssetDecision decision = result.decisions().getFirst();
        assertThat(decision.hasAsset()).isTrue();
        assertThat(decision.chosen().orElseThrow().label()).isEqualTo("Con vịt");
        assertThat(result.output().at("/questions/0/asset").asString()).isEqualTo(decision.assetId());
    }

    @Test
    void fillEmptyPreservesValidAiAssetAndParticipatesInStyleLock() {
        // Ô 1: AI đã chọn fluent-animal-dog (họ fluent)
        // Ô 2: visualPrompt "con mèo" chưa có asset -> binder tìm thấy anim-cat, kenney-cat, fluent-cat.
        // Nhờ StyleLock (họ fluent đang có 1 ô), ô 2 được khóa sang họ fluent (fluent-animal-cat)!
        String json = """
                {
                  "questions": [
                    {
                      "text": "Con chó",
                      "visualPrompt": "con chó",
                      "asset": "fluent-animal-dog"
                    },
                    {
                      "text": "Con mèo",
                      "visualPrompt": "con mèo"
                    }
                  ]
                }
                """;
        BindingResult result = binder.bind(parse(json), BindMode.FILL_EMPTY);
        assertThat(result.decisions()).hasSize(2);

        // Ô 1 được giữ nguyên
        assertThat(result.decisions().get(0).assetId()).isEqualTo("fluent-animal-dog");
        assertThat(result.decisions().get(0).route()).isEqualTo("ai");

        // Ô 2 khóa theo họ fluent
        assertThat(result.decisions().get(1).assetId()).isEqualTo("fluent-animal-cat");
        assertThat(result.decisions().get(1).route()).contains("+style-lock");
    }

    @Test
    void overrideModeReResolvesAllCells() {
        String json = """
                {
                  "questions": [
                    {
                      "text": "Con cún",
                      "visualPrompt": "chú cún con",
                      "asset": "anim-dog"
                    }
                  ]
                }
                """;
        BindingResult result = binder.bind(parse(json), BindMode.OVERRIDE);
        assertThat(result.decisions()).hasSize(1);
        assertThat(result.decisions().getFirst().route()).isNotEqualTo("ai");
    }

    @Test
    void oneSampleForEveryStructure() {
        // 1. QUIZ
        String quiz = """
                { "questions": [{ "text": "Hỏi", "options": ["A", "B"], "correctIndex": 0, "visualPrompt": "con gà" }] }
                """;
        BindingResult resQuiz = binder.bind(parse(quiz), BindMode.OVERRIDE);
        assertThat(resQuiz.output().at("/questions/0/asset").asString()).isNotBlank();

        // 2. AUDIO_VISUAL_MATCH
        String avm = """
                {
                  "questions": [
                    {
                      "audioText": "Nghe tiếng",
                      "correct": { "visualPrompt": "con vịt" },
                      "distractors": [
                        { "visualPrompt": "con chó" },
                        { "visualPrompt": "con lợn" }
                      ]
                    }
                  ]
                }
                """;
        BindingResult resAvm = binder.bind(parse(avm), BindMode.OVERRIDE);
        assertThat(resAvm.output().at("/questions/0/correct/asset").asString()).isNotBlank();
        assertThat(resAvm.output().at("/questions/0/distractors/0/asset").asString()).isNotBlank();
        assertThat(resAvm.output().at("/questions/0/distractors/1/asset").asString()).isNotBlank();

        // 3. MATCHING
        String matching = """
                {
                  "questions": [
                    {
                      "pairs": [
                        {
                          "left": { "text": "con bò", "visualPrompt": "con bò" },
                          "right": { "text": "cow", "visualPrompt": "con bò" }
                        }
                      ]
                    }
                  ]
                }
                """;
        BindingResult resMatching = binder.bind(parse(matching), BindMode.OVERRIDE);
        assertThat(resMatching.output().at("/questions/0/pairs/0/left/asset").asString()).isNotBlank();
        assertThat(resMatching.output().at("/questions/0/pairs/0/right/asset").asString()).isNotBlank();

        // 4. MEMORY_CARD
        String memoryCard = """
                {
                  "questions": [
                    {
                      "pairs": [
                        { "visualPrompt": "con khỉ", "text": "Khỉ" },
                        { "visualPrompt": "con voi", "text": "Voi" }
                      ]
                    }
                  ]
                }
                """;
        BindingResult resMem = binder.bind(parse(memoryCard), BindMode.OVERRIDE);
        assertThat(resMem.output().at("/questions/0/pairs/0/asset").asString()).isNotBlank();
        assertThat(resMem.output().at("/questions/0/pairs/1/asset").asString()).isNotBlank();

        // 5. DRAG_DROP
        String dragDrop = """
                {
                  "questions": [
                    {
                      "dropZones": [{ "label": "Vật nuôi" }],
                      "items": [
                        { "text": "chó", "visualPrompt": "con chó", "zoneIndex": 0 }
                      ]
                    }
                  ]
                }
                """;
        BindingResult resDrag = binder.bind(parse(dragDrop), BindMode.OVERRIDE);
        assertThat(resDrag.output().at("/questions/0/items/0/asset").asString()).isNotBlank();

        // 6. ORDERING
        String ordering = """
                {
                  "questions": [
                    {
                      "steps": [
                        { "text": "con ếch", "visualPrompt": "con ếch" },
                        { "text": "con cá", "visualPrompt": "con cá" }
                      ]
                    }
                  ]
                }
                """;
        BindingResult resOrder = binder.bind(parse(ordering), BindMode.OVERRIDE);
        assertThat(resOrder.output().at("/questions/0/steps/0/asset").asString()).isNotBlank();
        assertThat(resOrder.output().at("/questions/0/steps/1/asset").asString()).isNotBlank();

        // 7. SPOT_THE_TARGET
        String spot = """
                {
                  "questions": [
                    {
                      "visualPrompt": "con mèo",
                      "targetDescription": "con mèo"
                    }
                  ]
                }
                """;
        BindingResult resSpot = binder.bind(parse(spot), BindMode.OVERRIDE);
        assertThat(resSpot.output().at("/questions/0/asset").asString()).isNotBlank();

        // 8. VISUAL_CLOZE
        String cloze = """
                {
                  "questions": [
                    {
                      "sentenceTemplate": "Con {cloze} sủa gâu gâu",
                      "visualPrompt": "con chó",
                      "correctAnswer": "chó",
                      "distractors": ["mèo"]
                    }
                  ]
                }
                """;
        BindingResult resCloze = binder.bind(parse(cloze), BindMode.OVERRIDE);
        assertThat(resCloze.output().at("/questions/0/asset").asString()).isNotBlank();

        // 9. WORD_SCRAMBLE
        String scramble = """
                {
                  "questions": [
                    {
                      "correctWord": "MÈO",
                      "visualPrompt": "con mèo"
                    }
                  ]
                }
                """;
        BindingResult resScramble = binder.bind(parse(scramble), BindMode.OVERRIDE);
        assertThat(resScramble.output().at("/questions/0/asset").asString()).isNotBlank();
    }
}
