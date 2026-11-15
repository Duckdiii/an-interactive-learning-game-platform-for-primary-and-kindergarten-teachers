package com.aigameplatform.backend.service.asset.binding;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class CellExtractorTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();
    private final CellExtractor extractor = new CellExtractor();

    private static JsonNode parse(String json) {
        try {
            return MAPPER.readTree(json);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void nullOrEmptyReturnsEmptyList() {
        assertThat(extractor.extract(null)).isEmpty();
        assertThat(extractor.extract(parse("{}"))).isEmpty();
        assertThat(extractor.extract(parse("[]"))).isEmpty();
    }

    @Test
    void oddOneOutProducesNoCells() {
        String json = """
                {
                  "questions": [
                    {
                      "items": ["con chó", "con mèo", "cái ghế", "con gà"],
                      "oddOneOutIndex": 2,
                      "audioText": "Tìm con vật khác loại"
                    }
                  ]
                }
                """;
        List<CellContext> cells = extractor.extract(parse(json));
        assertThat(cells).isEmpty();
    }

    @Test
    void quizExtractsQuestionsAndIgnoresOptions() {
        String json = """
                {
                  "questions": [
                    {
                      "text": "Con gì bắt chuột?",
                      "options": ["Con chó", "Con mèo", "Con lợn"],
                      "correctIndex": 1,
                      "visualPrompt": "con mèo vàng",
                      "asset": "anim-cat"
                    },
                    {
                      "text": "Có mấy con vịt?",
                      "options": ["2", "3"],
                      "correctIndex": 0
                    }
                  ]
                }
                """;
        List<CellContext> cells = extractor.extract(parse(json));

        assertThat(cells).hasSize(2);

        CellContext first = cells.get(0);
        assertThat(first.path()).isEqualTo("/questions/0");
        assertThat(first.visualPrompt()).isEqualTo("con mèo vàng");
        assertThat(first.currentAsset()).isEqualTo("anim-cat");
        assertThat(first.query()).isEqualTo("con mèo vàng");
        assertThat(first.usesSiblingText()).isFalse();

        CellContext second = cells.get(1);
        assertThat(second.path()).isEqualTo("/questions/1");
        assertThat(second.visualPrompt()).isNull();
        assertThat(second.currentAsset()).isNull();
        assertThat(second.siblingText()).isEqualTo("Có mấy con vịt?");
        assertThat(second.query()).isEqualTo("Có mấy con vịt?");
        assertThat(second.usesSiblingText()).isTrue();
    }

    @Test
    void audioVisualMatchExtractsCorrectAndDistractors() {
        String json = """
                {
                  "questions": [
                    {
                      "audioText": "Chọn hình con mèo",
                      "correct": {
                        "visualPrompt": "con mèo"
                      },
                      "distractors": [
                        { "visualPrompt": "con chó" },
                        { "visualPrompt": "con gà" }
                      ]
                    }
                  ]
                }
                """;
        List<CellContext> cells = extractor.extract(parse(json));

        assertThat(cells).hasSize(3);
        assertThat(cells).extracting(CellContext::path)
                .containsExactly("/questions/0/correct", "/questions/0/distractors/0", "/questions/0/distractors/1");
        assertThat(cells).extracting(CellContext::query)
                .containsExactly("con mèo", "con chó", "con gà");
    }

    @Test
    void matchingExtractsLeftAndRightPairs() {
        String json = """
                {
                  "questions": [
                    {
                      "pairs": [
                        {
                          "left": { "text": "con chó", "visualPrompt": "chú cún" },
                          "right": { "text": "dog", "visualPrompt": "dog", "asset": "anim-dog" }
                        }
                      ]
                    }
                  ]
                }
                """;
        List<CellContext> cells = extractor.extract(parse(json));

        assertThat(cells).hasSize(2);
        assertThat(cells.get(0).path()).isEqualTo("/questions/0/pairs/0/left");
        assertThat(cells.get(0).query()).isEqualTo("chú cún");

        assertThat(cells.get(1).path()).isEqualTo("/questions/0/pairs/0/right");
        assertThat(cells.get(1).query()).isEqualTo("dog");
        assertThat(cells.get(1).currentAsset()).isEqualTo("anim-dog");
    }

    @Test
    void memoryCardExtractsPairs() {
        String json = """
                {
                  "questions": [
                    {
                      "pairs": [
                        { "visualPrompt": "con voi", "text": "Voi" },
                        { "visualPrompt": "con hổ", "text": "Hổ" }
                      ]
                    }
                  ]
                }
                """;
        List<CellContext> cells = extractor.extract(parse(json));

        assertThat(cells).hasSize(2);
        assertThat(cells.get(0).path()).isEqualTo("/questions/0/pairs/0");
        assertThat(cells.get(0).query()).isEqualTo("con voi");
        assertThat(cells.get(1).path()).isEqualTo("/questions/0/pairs/1");
        assertThat(cells.get(1).query()).isEqualTo("con hổ");
    }

    @Test
    void dragDropExtractsItemsAndIgnoresDropZones() {
        String json = """
                {
                  "questions": [
                    {
                      "dropZones": [
                        { "label": "Vật nuôi" },
                        { "label": "Động vật hoang dã" }
                      ],
                      "items": [
                        { "text": "con chó", "visualPrompt": "con chó", "zoneIndex": 0 },
                        { "text": "con sư tử", "visualPrompt": "sư tử", "zoneIndex": 1 }
                      ]
                    }
                  ]
                }
                """;
        List<CellContext> cells = extractor.extract(parse(json));

        assertThat(cells).hasSize(2);
        assertThat(cells.get(0).path()).isEqualTo("/questions/0/items/0");
        assertThat(cells.get(0).query()).isEqualTo("con chó");
        assertThat(cells.get(1).path()).isEqualTo("/questions/0/items/1");
        assertThat(cells.get(1).query()).isEqualTo("sư tử");
    }

    @Test
    void orderingExtractsSteps() {
        String json = """
                {
                  "questions": [
                    {
                      "steps": [
                        { "text": "Gieo hạt", "visualPrompt": "hạt giống" },
                        { "text": "Tưới nước", "visualPrompt": "bình tưới nước" }
                      ]
                    }
                  ]
                }
                """;
        List<CellContext> cells = extractor.extract(parse(json));

        assertThat(cells).hasSize(2);
        assertThat(cells.get(0).path()).isEqualTo("/questions/0/steps/0");
        assertThat(cells.get(0).query()).isEqualTo("hạt giống");
        assertThat(cells.get(1).path()).isEqualTo("/questions/0/steps/1");
        assertThat(cells.get(1).query()).isEqualTo("bình tưới nước");
    }

    @Test
    void spotTheTargetExtractsQuestions() {
        String json = """
                {
                  "questions": [
                    {
                      "visualPrompt": "khu vườn có chú mèo",
                      "targetDescription": "con mèo"
                    }
                  ]
                }
                """;
        List<CellContext> cells = extractor.extract(parse(json));

        assertThat(cells).hasSize(1);
        assertThat(cells.get(0).path()).isEqualTo("/questions/0");
        assertThat(cells.get(0).query()).isEqualTo("khu vườn có chú mèo");
    }

    @Test
    void visualClozeExtractsQuestions() {
        String json = """
                {
                  "questions": [
                    {
                      "sentenceTemplate": "Con {cloze} bắt chuột",
                      "visualPrompt": "con mèo",
                      "correctAnswer": "mèo",
                      "distractors": ["chó", "gà"]
                    }
                  ]
                }
                """;
        List<CellContext> cells = extractor.extract(parse(json));

        assertThat(cells).hasSize(1);
        assertThat(cells.get(0).path()).isEqualTo("/questions/0");
        assertThat(cells.get(0).query()).isEqualTo("con mèo");
    }

    @Test
    void wordScrambleExtractsQuestions() {
        String json = """
                {
                  "questions": [
                    {
                      "correctWord": "CHÓ",
                      "visualPrompt": "con chó"
                    }
                  ]
                }
                """;
        List<CellContext> cells = extractor.extract(parse(json));

        assertThat(cells).hasSize(1);
        assertThat(cells.get(0).path()).isEqualTo("/questions/0");
        assertThat(cells.get(0).query()).isEqualTo("con chó");
    }
}
