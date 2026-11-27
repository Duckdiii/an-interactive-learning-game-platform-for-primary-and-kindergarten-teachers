package com.aigameplatform.backend.service.asset.binding;

import static org.assertj.core.api.Assertions.assertThat;

import com.aigameplatform.backend.dto.dsl.GameDsl;
import com.aigameplatform.backend.dto.dsl.ai.AiGameOutput;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.service.asset.KeywordAssetRetriever;
import com.aigameplatform.backend.service.asset.concept.ConceptGraph;
import com.aigameplatform.backend.service.factory.GameAssetCatalog;
import com.aigameplatform.backend.service.factory.GameDslFactoryRegistry;
import com.aigameplatform.backend.service.factory.GameDslRequest;
import com.aigameplatform.backend.service.testsupport.GameAssetCatalogFixture;
import com.aigameplatform.backend.service.testsupport.GameTestFixtures;
import com.aigameplatform.backend.service.validation.AbstractGameValidator;
import com.aigameplatform.backend.service.validation.AssetMeaningGameValidator;
import com.aigameplatform.backend.service.validation.GameValidationContext;
import com.aigameplatform.backend.service.validation.GameValidationService;
import com.aigameplatform.backend.service.validation.ValidationError;
import com.aigameplatform.backend.service.validation.ValidationReport;
import com.aigameplatform.backend.service.validation.ai.AiOutputReport;
import com.aigameplatform.backend.service.validation.ai.AiOutputValidator;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.random.RandomGenerator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Bước 9: Kiểm thử Replay Offline đo đạc và so sánh 3 chế độ (OFF, FILL_EMPTY, OVERRIDE)
 * trên 8 fixture JSON thô (QUIZ, AUDIO_VISUAL_MATCH, MATCHING, MEMORY_CARD) qua toàn bộ pipeline:
 * AiOutputValidator -> GameAssetBinder -> FactoryRegistry -> GameValidationService (kèm AssetMeaningGameValidator).
 *
 * Đo đạc 4 chỉ số:
 * 1. Số ô có hình (totalImages)
 * 2. Số họ phong cách (styleFamilyCount)
 * 3. Số ô thay đổi so với AI (cellsChangedFromAi)
 * 4. Số vi phạm nghĩa của hình (meaningViolations)
 */
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class BindingReplayEvalTest {

    private final JsonMapper mapper = JsonMapper.builder().build();
    private final GameAssetCatalog catalog = GameAssetCatalogFixture.ASSETS;
    private final KeywordAssetRetriever retriever = new KeywordAssetRetriever(catalog);

    private GameAssetBinder binder;
    private AiOutputValidator aiOutputValidator;
    private GameDslFactoryRegistry factoryRegistry;
    private AssetMeaningGameValidator assetMeaningValidator;
    private GameValidationService validationService;

    record EvalFixture(
            String id,
            String name,
            GameType gameType,
            GameDslRequest request,
            String rawAiJson
    ) {}

    record ReplayMetrics(
            int totalImages,
            int styleFamilyCount,
            Set<String> families,
            int cellsChangedFromAi,
            int meaningViolations,
            boolean dslValid,
            List<String> validationErrors
    ) {}

    private final List<EvalFixture> fixtures = new ArrayList<>();
    private final Map<String, Map<String, ReplayMetrics>> resultsTable = new LinkedHashMap<>();

    @BeforeAll
    void setUp() {
        ConceptGraph conceptGraph = new ConceptGraph(mapper, catalog);
        LabelLookupResolver labelResolver = new LabelLookupResolver(retriever, catalog);
        ConceptGraphResolver conceptResolver = new ConceptGraphResolver(conceptGraph, catalog);
        StyleLockPolicy styleLockPolicy = new StyleLockPolicy(true, 0.4);
        CellExtractor cellExtractor = new CellExtractor();
        binder = new GameAssetBinder(cellExtractor, List.of(labelResolver, conceptResolver), styleLockPolicy, catalog);

        aiOutputValidator = new AiOutputValidator(mapper);
        factoryRegistry = GameTestFixtures.factoryRegistry(RandomGenerator.of("L128X256MixRandom"));
        assetMeaningValidator = new AssetMeaningGameValidator(catalog, retriever);

        List<AbstractGameValidator> validators = new ArrayList<>(GameTestFixtures.schemaAndBusinessRuleValidators(mapper));
        validators.add(assetMeaningValidator);
        validationService = new GameValidationService(validators, mapper);

        initFixtures();
        runAllEvaluations();
        printEvaluationTable();
    }

    private void initFixtures() {
        GameDslRequest reqAnimal = new GameDslRequest("Thế giới động vật", Subject.VIETNAMESE, GradeLevel.GRADE_1);
        GameDslRequest reqFruit = new GameDslRequest("Khám phá các loại trái cây", Subject.VIETNAMESE, GradeLevel.GRADE_1);
        GameDslRequest reqObject = new GameDslRequest("Đồ dùng học tập và gia đình", Subject.VIETNAMESE, GradeLevel.GRADE_1);

        // Fixture 1: QUIZ - Động vật (AI gán nhầm mèo vào câu hỏi vịt, ếch để trống, chó dùng kenney, mèo dùng fluent)
        fixtures.add(new EvalFixture(
                "FX-01",
                "Quiz động vật (lẫn style + nhầm nghĩa + thiếu ô)",
                GameType.QUIZ,
                reqAnimal,
                """
                {
                  "questions": [
                    {
                      "text": "Hình nào dưới đây là con vịt?",
                      "options": ["Con vịt", "Con gà"],
                      "correctIndex": 0,
                      "visualPrompt": "con vịt",
                      "asset": "fluent-animal-cat",
                      "audioText": "Hình nào là con vịt?"
                    },
                    {
                      "text": "Hình nào dưới đây là con ếch?",
                      "options": ["Con ếch", "Con cá"],
                      "correctIndex": 0,
                      "visualPrompt": "con ếch",
                      "audioText": "Hình nào là con ếch?"
                    },
                    {
                      "text": "Hình nào dưới đây là con chó?",
                      "options": ["Con chó", "Con mèo"],
                      "correctIndex": 0,
                      "visualPrompt": "con chó",
                      "asset": "kenney-animal-dog",
                      "audioText": "Hình nào là con chó?"
                    },
                    {
                      "text": "Hình nào dưới đây là con mèo?",
                      "options": ["Con chim", "Con mèo"],
                      "correctIndex": 1,
                      "visualPrompt": "con mèo",
                      "asset": "fluent-animal-cat",
                      "audioText": "Hình nào là con mèo?"
                    }
                  ]
                }
                """
        ));

        // Fixture 2: QUIZ - Trái cây (Quả chuối AI quên gán asset)
        fixtures.add(new EvalFixture(
                "FX-02",
                "Quiz hoa quả (thiếu ô chuối)",
                GameType.QUIZ,
                reqFruit,
                """
                {
                  "questions": [
                    {
                      "text": "Quả nào là quả táo?",
                      "options": ["Quả táo", "Quả lê"],
                      "correctIndex": 0,
                      "visualPrompt": "quả táo",
                      "asset": "fruit-apple",
                      "audioText": "Quả nào là quả táo?"
                    },
                    {
                      "text": "Quả nào là quả chuối?",
                      "options": ["Quả chuối", "Quả cam"],
                      "correctIndex": 0,
                      "visualPrompt": "quả chuối",
                      "audioText": "Quả nào là quả chuối?"
                    },
                    {
                      "text": "Quả nào là quả dâu tây?",
                      "options": ["Quả dưa", "Quả dâu tây"],
                      "correctIndex": 1,
                      "visualPrompt": "quả dâu tây",
                      "asset": "fruit-strawberry",
                      "audioText": "Quả nào là quả dâu tây?"
                    }
                  ]
                }
                """
        ));

        // Fixture 3: AUDIO_VISUAL_MATCH - Tiếng kêu động vật (Lẫn họ kenney và fluent, có ô để trống)
        fixtures.add(new EvalFixture(
                "FX-03",
                "AudioVisualMatch tiếng kêu động vật (lẫn kenney/fluent + thiếu ô)",
                GameType.AUDIO_VISUAL_MATCH,
                reqAnimal,
                """
                {
                  "questions": [
                    {
                      "audioText": "Con lợn kêu éc éc",
                      "correct": {
                        "visualPrompt": "con lợn",
                        "asset": "kenney-animal-pig"
                      },
                      "distractors": [
                        {
                          "visualPrompt": "con ếch"
                        },
                        {
                          "visualPrompt": "con vịt",
                          "asset": "kenney-animal-duck"
                        }
                      ]
                    },
                    {
                      "audioText": "Con mèo kêu meo meo",
                      "correct": {
                        "visualPrompt": "con mèo",
                        "asset": "fluent-animal-cat"
                      },
                      "distractors": [
                        {
                          "visualPrompt": "con chó",
                          "asset": "kenney-animal-dog"
                        },
                        {
                          "visualPrompt": "con ếch",
                          "asset": "kenney-animal-frog"
                        }
                      ]
                    }
                  ]
                }
                """
        ));

        // Fixture 4: AUDIO_VISUAL_MATCH - Đồ vật lớp học (Ô sách để trống)
        fixtures.add(new EvalFixture(
                "FX-04",
                "AudioVisualMatch đồ vật (thiếu ô quyển sách)",
                GameType.AUDIO_VISUAL_MATCH,
                reqObject,
                """
                {
                  "questions": [
                    {
                      "audioText": "Cái ghế học sinh",
                      "correct": {
                        "visualPrompt": "cái ghế",
                        "asset": "fluent-object-chair"
                      },
                      "distractors": [
                        {
                          "visualPrompt": "cái bàn",
                          "asset": "custom-object-table"
                        },
                        {
                          "visualPrompt": "quyển sách"
                        }
                      ]
                    },
                    {
                      "audioText": "Quyển sách bài tập",
                      "correct": {
                        "visualPrompt": "quyển sách"
                      },
                      "distractors": [
                        {
                          "visualPrompt": "cái ghế",
                          "asset": "fluent-object-chair"
                        },
                        {
                          "visualPrompt": "cái bàn",
                          "asset": "custom-object-table"
                        }
                      ]
                    }
                  ]
                }
                """
        ));

        // Fixture 5: MATCHING - Động vật (Nối tên với hình, lẫn kenney và fluent, thiếu ô lợn)
        fixtures.add(new EvalFixture(
                "FX-05",
                "Matching con vật (lẫn kenney/fluent + thiếu ô)",
                GameType.MATCHING,
                reqAnimal,
                """
                {
                  "questions": [
                    {
                      "audioText": "Nối tên loài vật với hình tương ứng.",
                      "pairs": [
                        {
                          "left": {
                            "text": "con ếch",
                            "visualPrompt": "con ếch",
                            "asset": "kenney-animal-frog"
                          },
                          "right": {
                            "text": "Chú ếch xanh"
                          }
                        },
                        {
                          "left": {
                            "text": "con vịt",
                            "visualPrompt": "con vịt",
                            "asset": "kenney-animal-duck"
                          },
                          "right": {
                            "text": "Vịt bơi lội"
                          }
                        },
                        {
                          "left": {
                            "text": "con chó",
                            "visualPrompt": "con chó",
                            "asset": "fluent-animal-dog"
                          },
                          "right": {
                            "text": "Chó trông nhà"
                          }
                        },
                        {
                          "left": {
                            "text": "con lợn",
                            "visualPrompt": "con lợn"
                          },
                          "right": {
                            "text": "Lợn ủn ỉn"
                          }
                        }
                      ]
                    }
                  ]
                }
                """
        ));

        // Fixture 6: MATCHING - Trái cây (Lẫn fruit và fluent-food, thiếu ô dâu tây)
        fixtures.add(new EvalFixture(
                "FX-06",
                "Matching hoa quả (lẫn fruit/fluent-food + thiếu ô)",
                GameType.MATCHING,
                reqFruit,
                """
                {
                  "questions": [
                    {
                      "audioText": "Nối tên quả với đặc điểm.",
                      "pairs": [
                        {
                          "left": {
                            "text": "quả táo",
                            "visualPrompt": "quả táo",
                            "asset": "fruit-apple"
                          },
                          "right": {
                            "text": "Táo đỏ ngọt"
                          }
                        },
                        {
                          "left": {
                            "text": "quả chuối",
                            "visualPrompt": "quả chuối",
                            "asset": "fluent-food-banana"
                          },
                          "right": {
                            "text": "Chuối chín vàng"
                          }
                        },
                        {
                          "left": {
                            "text": "quả dâu tây",
                            "visualPrompt": "quả dâu tây"
                          },
                          "right": {
                            "text": "Dâu tây thơm mát"
                          }
                        }
                      ]
                    }
                  ]
                }
                """
        ));

        // Fixture 7: MEMORY_CARD - Động vật (Đa số fluent, 1 ô kenney, 1 ô lợn để trống)
        fixtures.add(new EvalFixture(
                "FX-07",
                "MemoryCard động vật (đa số fluent, 1 kenney, 1 thiếu)",
                GameType.MEMORY_CARD,
                reqAnimal,
                """
                {
                  "questions": [
                    {
                      "audioText": "Tìm các cặp thẻ con vật giống nhau.",
                      "pairs": [
                        {
                          "visualPrompt": "con vịt",
                          "asset": "fluent-animal-duck"
                        },
                        {
                          "visualPrompt": "con ếch",
                          "asset": "fluent-animal-frog"
                        },
                        {
                          "visualPrompt": "con mèo",
                          "asset": "fluent-animal-cat"
                        },
                        {
                          "visualPrompt": "con chó",
                          "asset": "kenney-animal-dog"
                        },
                        {
                          "visualPrompt": "con lợn"
                        }
                      ]
                    }
                  ]
                }
                """
        ));

        // Fixture 8: MEMORY_CARD - Trái cây (3 quả họ fruit, quả cà rốt lạc sang fluent-food, quả dâu thiếu)
        fixtures.add(new EvalFixture(
                "FX-08",
                "MemoryCard rau củ quả (lẫn style + thiếu dâu)",
                GameType.MEMORY_CARD,
                reqFruit,
                """
                {
                  "questions": [
                    {
                      "audioText": "Lật tìm cặp thẻ hình quả giống nhau.",
                      "pairs": [
                        {
                          "visualPrompt": "quả táo",
                          "asset": "fruit-apple"
                        },
                        {
                          "visualPrompt": "quả chuối",
                          "asset": "fruit-banana"
                        },
                        {
                          "visualPrompt": "quả dâu tây"
                        },
                        {
                          "visualPrompt": "củ cà rốt",
                          "asset": "fluent-food-carrot"
                        }
                      ]
                    }
                  ]
                }
                """
        ));
    }

    private void runAllEvaluations() {
        for (EvalFixture f : fixtures) {
            Map<String, ReplayMetrics> modeMetrics = new LinkedHashMap<>();

            // 1. Chế độ OFF
            modeMetrics.put("OFF", evaluateMode(f, "OFF"));

            // 2. Chế độ FILL_EMPTY
            modeMetrics.put("FILL_EMPTY", evaluateMode(f, "FILL_EMPTY"));

            // 3. Chế độ OVERRIDE
            modeMetrics.put("OVERRIDE", evaluateMode(f, "OVERRIDE"));

            resultsTable.put(f.id(), modeMetrics);
        }
    }

    private ReplayMetrics evaluateMode(EvalFixture fixture, String mode) {
        JsonNode rawNode = mapper.readTree(fixture.rawAiJson());
        JsonNode jsonNodeToUse;
        int changedCount = 0;

        if ("OFF".equalsIgnoreCase(mode)) {
            jsonNodeToUse = rawNode;
            changedCount = 0;
        } else {
            BindMode bindMode = "OVERRIDE".equalsIgnoreCase(mode) ? BindMode.OVERRIDE : BindMode.FILL_EMPTY;
            BindingResult bindingResult = binder.bind(rawNode, bindMode);
            jsonNodeToUse = bindingResult.output();

            for (AssetDecision decision : bindingResult.decisions()) {
                String pathPtr = decision.path().replace("$.", "/").replace("[", "/").replace("]", "").replace(".", "/");
                JsonNode originalCell = rawNode.at(pathPtr);
                String originalAsset = originalCell.path("asset").asString(null);
                if (!Objects.equals(decision.assetId(), originalAsset)) {
                    changedCount++;
                }
            }
        }

        String jsonStringToUse = mapper.writeValueAsString(jsonNodeToUse);

        // Bước A: Validate AI Output
        AiOutputReport aiReport = aiOutputValidator.validate(fixture.gameType(), jsonStringToUse);
        assertThat(aiReport.errors())
                .as("AI output schema must be valid for fixture %s in mode %s", fixture.id(), mode)
                .isEmpty();
        AiGameOutput aiOutput = aiReport.output();
        assertThat(aiOutput).isNotNull();

        // Bước B: Chuyển đổi thành GameDsl qua FactoryRegistry
        GameDsl gameDsl = factoryRegistry.create(fixture.gameType(), aiOutput, fixture.request());
        assertThat(gameDsl).isNotNull();

        // Bước C: Chuyển GameDsl sang JSON và Validate qua GameValidationService
        JsonNode gameNode = mapper.valueToTree(gameDsl);

        // Đếm số hình và họ phong cách
        List<String> imageUrls = new ArrayList<>();
        collectImages(gameNode, imageUrls);
        int totalImages = imageUrls.size();

        Set<String> families = new HashSet<>();
        for (String url : imageUrls) {
            GameAssetCatalog.Entry entry = catalog.findByUrl(url);
            if (entry != null && entry.family() != null && !entry.family().isBlank()) {
                families.add(entry.family());
            }
        }

        // Đo vi phạm nghĩa của hình
        List<ValidationError> meaningErrors = assetMeaningValidator.validate(new GameValidationContext(gameNode));
        int meaningViolations = meaningErrors.size();

        // Đánh giá toàn diện validation report
        ValidationReport report = validationService.validate(gameNode);
        boolean dslValid = report.valid();
        List<String> errorMessages = report.errors().stream()
                .map(e -> e.path() + ": " + e.message())
                .toList();

        return new ReplayMetrics(
                totalImages,
                families.size(),
                families,
                changedCount,
                meaningViolations,
                dslValid,
                errorMessages
        );
    }

    private void collectImages(JsonNode node, List<String> imageUrls) {
        if (node.isObject()) {
            node.properties().forEach(entry -> {
                if ("imageUrl".equals(entry.getKey()) && entry.getValue().isTextual()) {
                    String url = entry.getValue().asString();
                    if (url != null && !url.isBlank()) {
                        imageUrls.add(url);
                    }
                } else {
                    collectImages(entry.getValue(), imageUrls);
                }
            });
        } else if (node.isArray()) {
            for (JsonNode child : node) {
                collectImages(child, imageUrls);
            }
        }
    }

    private void printEvaluationTable() {
        System.out.println();
        System.out.println("============================================================================================================================================");
        System.out.println("                                  KẾT QUẢ ĐO ĐẠC REPLAY OFFLINE MODULE GAME ASSET BINDER (BƯỚC 9)");
        System.out.println("============================================================================================================================================");
        System.out.printf("| %-6s | %-19s | %-10s | %-6s | %-7s | %-18s | %-7s | %-11s | %-9s |\n",
                "ID", "Loại Game", "Chế độ", "Hình", "Số Họ", "Họ Phong Cách", "Đổi AI", "Lỗi Nghĩa", "DSL Hợp lệ");
        System.out.println("--------------------------------------------------------------------------------------------------------------------------------------------");

        for (EvalFixture f : fixtures) {
            Map<String, ReplayMetrics> modes = resultsTable.get(f.id());
            for (Map.Entry<String, ReplayMetrics> entry : modes.entrySet()) {
                String mode = entry.getKey();
                ReplayMetrics m = entry.getValue();
                String familyStr = String.join(",", m.families());
                System.out.printf("| %-6s | %-19s | %-10s | %-6d | %-7d | %-18s | %-7d | %-11d | %-9s |\n",
                        f.id(), f.gameType(), mode, m.totalImages(), m.styleFamilyCount(),
                        familyStr.isEmpty() ? "(trống)" : familyStr, m.cellsChangedFromAi(), m.meaningViolations(),
                        m.dslValid() ? "PASS" : "FAIL (" + m.validationErrors().size() + ")");
            }
            System.out.println("--------------------------------------------------------------------------------------------------------------------------------------------");
        }
        System.out.println("============================================================================================================================================");
        System.out.println();
    }

    @Test
    @DisplayName("Tất cả các fixture đều sinh ra DSL hợp lệ ở chế độ OVERRIDE; ở FILL_EMPTY giữ nguyên lỗi AI nếu có")
    void allModesGenerateValidDslOrExpectedMeaningViolations() {
        for (EvalFixture f : fixtures) {
            Map<String, ReplayMetrics> modes = resultsTable.get(f.id());

            // OVERRIDE luôn phải pass 100% toàn bộ Layer 1, 2 và Layer AssetMeaning
            assertThat(modes.get("OVERRIDE").dslValid())
                    .as("Fixture %s mode OVERRIDE must be valid DSL, errors: %s", f.id(), modes.get("OVERRIDE").validationErrors())
                    .isTrue();

            // FX-01 cố tình gán mèo vào câu hỏi vịt để kiểm tra vi phạm nghĩa ở mode OFF và FILL_EMPTY
            if ("FX-01".equals(f.id())) {
                assertThat(modes.get("OFF").meaningViolations())
                        .as("FX-01 mode OFF must detect 1 meaning violation")
                        .isEqualTo(1);
                assertThat(modes.get("FILL_EMPTY").meaningViolations())
                        .as("FX-01 mode FILL_EMPTY preserves AI's wrong choice so it still has 1 meaning violation")
                        .isEqualTo(1);
                assertThat(modes.get("OVERRIDE").meaningViolations())
                        .as("FX-01 mode OVERRIDE must fix the wrong choice and have 0 meaning violations")
                        .isZero();
            } else {
                assertThat(modes.get("OFF").meaningViolations())
                        .as("Fixture %s mode OFF has unexpected meaning violation", f.id())
                        .isZero();
                assertThat(modes.get("FILL_EMPTY").dslValid())
                        .as("Fixture %s mode FILL_EMPTY must be valid DSL, errors: %s", f.id(), modes.get("FILL_EMPTY").validationErrors())
                        .isTrue();
            }
        }
    }

    @Test
    @DisplayName("Chế độ FILL_EMPTY: Lấp đầy các ô trống, giữ nguyên các ô AI đã chọn hợp lệ")
    void fillEmptyFillsAllMissingSlotsAndPreservesAiSelections() {
        for (EvalFixture f : fixtures) {
            ReplayMetrics off = resultsTable.get(f.id()).get("OFF");
            ReplayMetrics fill = resultsTable.get(f.id()).get("FILL_EMPTY");

            // Số ô có hình ở FILL_EMPTY luôn >= số ô ở OFF
            assertThat(fill.totalImages())
                    .as("Fixture %s: FILL_EMPTY images (%d) should be >= OFF images (%d)", f.id(), fill.totalImages(), off.totalImages())
                    .isGreaterThanOrEqualTo(off.totalImages());

            // Số ô thay đổi bằng đúng số ô được lấp đầy (hoặc id lạ)
            assertThat(fill.cellsChangedFromAi())
                    .as("Fixture %s: FILL_EMPTY must change at least 1 missing/strange cell", f.id())
                    .isGreaterThan(0);
        }
    }

    @Test
    @DisplayName("Chế độ OVERRIDE: Khóa họ phong cách thống nhất, số họ style <= mode OFF, lỗi nghĩa về 0")
    void overrideLocksStyleAndEliminatesMeaningViolations() {
        for (EvalFixture f : fixtures) {
            ReplayMetrics off = resultsTable.get(f.id()).get("OFF");
            ReplayMetrics override = resultsTable.get(f.id()).get("OVERRIDE");

            // 1. Số vi phạm nghĩa của hình ở OVERRIDE luôn là 0
            assertThat(override.meaningViolations())
                    .as("Fixture %s: OVERRIDE must eliminate all meaning violations", f.id())
                    .isZero();

            // 2. Với các fixture có phân mảnh phong cách (số họ ở OFF > 1), OVERRIDE phải thu hẹp hoặc giữ <= số họ ở OFF
            if (off.styleFamilyCount() > 1) {
                assertThat(override.styleFamilyCount())
                        .as("Fixture %s: OVERRIDE style family count (%d) should be <= OFF (%d)",
                                f.id(), override.styleFamilyCount(), off.styleFamilyCount())
                        .isLessThanOrEqualTo(off.styleFamilyCount());
            }

            // 3. Số ô có hình ở OVERRIDE phải đạt tối đa (>= số ô ở OFF)
            assertThat(override.totalImages())
                    .as("Fixture %s: OVERRIDE images (%d) should be >= OFF images (%d)", f.id(), override.totalImages(), off.totalImages())
                    .isGreaterThanOrEqualTo(off.totalImages());
        }
    }
}
