package com.aigameplatform.backend.flow;

import com.aigameplatform.backend.service.generation.GameContentGenerator;
import com.aigameplatform.backend.service.understanding.GameUnderstandingGenerator;
import com.aigameplatform.backend.service.generation.Revision;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

/**
 * Cổng AI giả cho test luồng (profile {@code verify-flow}): không gọi Gemini, chạy được trên CI và không tốn tiền.
 * Bản Gemini thật chỉ nạp khi {@code app.ai.gemini.game-generation.enabled=true}, nên hai bản không cùng tồn tại.
 */
@Configuration
@Profile("verify-flow")
class FakeAiConfiguration {

    /** Chuỗi thay thế khi sửa game, để test thấy được kết quả đi qua nhánh revise chứ không phải nhánh sinh mới. */
    static final String REVISED_MARKER = "con gà";

    @Bean
    GameContentGenerator fakeGameContentGenerator() {
        return attempt -> {
            if (attempt.revision() != null) return revise(attempt.revision());
            if (attempt.gameType() == null || attempt.gameType() == com.aigameplatform.backend.entity.enums.GameType.CUSTOM)
                throw new IllegalArgumentException("Unknown DSL verification scenario");
            return classpath("ai-output-examples/" + attempt.gameType().name().toLowerCase(Locale.ROOT).replace('_', '-') + ".json");
        };
    }

    @Bean
    com.aigameplatform.backend.service.generation.cpf.CpfContentGenerator fakeCpfContentGenerator() {
        return attempt -> {
            if (attempt.revision() != null) throw new IllegalArgumentException("No CPF revision fixture");
            var mapper = JsonMapper.builder().build();
            if (attempt.idea() != null && attempt.idea().startsWith("E2E CPF: ")) {
                String[] scenario = attempt.idea().substring("E2E CPF: ".length()).split("/", -1);
                if (scenario.length > 2 || !Set.of("fishing-compound-words", "catch-even-apples", "archery-addition",
                        "rabbit-pick-carrots", "sort-land-water-animals", "race-multiplication").contains(scenario[0]))
                    throw new IllegalArgumentException("Unknown CPF verification scenario");
                String fixture = classpath("cpf-examples/" + scenario[0] + ".json");
                if (scenario.length == 1) return fixture;
                if (!scenario[0].equals("fishing-compound-words") || !Set.of("STATIC", "FALL", "FLOAT_UP",
                        "PATROL_X", "BOB", "SWAY_UP", "ORBIT", "CROSS").contains(scenario[1]))
                    throw new IllegalArgumentException("Unknown CPF motion verification scenario");
                ObjectNode variant = (ObjectNode) mapper.readTree(fixture);
                ((ObjectNode) variant.path("entities").get(0)).putObject("motion")
                        .put("type", scenario[1]).put("speed", "SLOW");
                return mapper.writeValueAsString(variant);
            }
            ObjectNode game = (ObjectNode) mapper.readTree(classpath("cpf-examples/fishing-compound-words.json"));
            ObjectNode fish = (ObjectNode) game.path("entities").get(0);
            fish.remove("motion");
            ((ObjectNode) fish.path("placement")).put("arrangement", "ROW");
            int index = 1;
            for (var round : game.path("content").path("rounds")) {
                ((ObjectNode) round).put("prompt", "Màn " + index++ + ": Từ nào là từ ghép?");
            }
            return mapper.writeValueAsString(game);
        };
    }

    private static String revise(Revision revision) {
        String instruction = revision.instruction();
        boolean contextual = "Theo yêu cầu trước, đổi con chó thành con gà".equals(instruction);
        boolean known = "Đổi con chó thành con gà".equals(instruction)
                || "Đổi câu hỏi thứ hai sang đếm con gà".equals(instruction) || contextual;
        if (!known || (contextual && revision.history().stream().noneMatch(t ->
                t.role() == com.aigameplatform.backend.dto.understanding.ChatTurn.Role.TEACHER
                && "Chỉ sửa câu thứ hai, giữ nguyên câu đầu".equals(t.text())))) {
            throw new IllegalArgumentException("Unknown verification scenario or missing revision history");
        }
        var mapper = JsonMapper.builder().build();
        var current = mapper.readTree(revision.currentGame());
        ObjectNode output = mapper.createObjectNode();
        var questions = output.putArray("questions");
        int index = 0;
        for (var question : current.path("questions")) {
            var target = questions.addObject();
            String text = question.path("questionText").asString();
            target.put("text", index++ == 1 ? text.replace("con chó", REVISED_MARKER) : text);
            var options = target.putArray("options");
            int optionIndex = 0;
            for (var option : question.path("options")) {
                options.add(option.path("text").asString());
                if (option.path("id").asString().equals(question.path("correctOptionId").asString()))
                    target.put("correctIndex", optionIndex);
                optionIndex++;
            }
            for (String field : new String[]{"audioText", "visualPrompt"}) {
                if (question.hasNonNull(field)) target.set(field, question.get(field));
            }
        }
        return mapper.writeValueAsString(output);
    }

    @Bean
    GameUnderstandingGenerator fakeGameUnderstandingGenerator() {
        return (system, user) -> """
                {"reply": "Em hiểu rồi ạ.", "question": null,
                 "understanding": {"learningGoal": "Đếm số lượng trong phạm vi 5", "childAction": "Chọn đáp án đúng",
                   "content": ["mèo", "chó"], "setting": "Trong lớp", "gameType": "QUIZ",
                   "alternativeGameTypes": ["MATCHING"], "unsupported": [], "assumptions": ["Lớp 1"]}}
                """;
    }

    private static String classpath(String path) {
        try (InputStream in = FakeAiConfiguration.class.getClassLoader().getResourceAsStream(path)) {
            if (in == null) throw new IllegalStateException("Thiếu fixture " + path);
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }
}
