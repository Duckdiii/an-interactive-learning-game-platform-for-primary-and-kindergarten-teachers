package com.aigameplatform.backend.service.strategy;

import com.aigameplatform.backend.dto.dsl.ai.QuizAiOutput;
import com.aigameplatform.backend.dto.dsl.ai.QuizAiQuestion;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import dev.langchain4j.model.chat.ChatModel;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@RequiredArgsConstructor
public class QuizSpikeContentService {

    public static final String PROMPT_VERSION = "quiz-count-animals-v3";

    private final ChatModel model;
    private final ObjectMapper objectMapper;

    public List<QuizAiQuestion> generate(String topic, GradeLevel grade) {
        return parseSpikeResult(generateRaw(topic, grade));
    }

    public String generateRaw(String topic, GradeLevel grade) {
        if (topic == null || topic.isBlank() || grade == null) {
            throw new IllegalArgumentException("Topic and grade are required");
        }

        String prompt = """
                Bạn là giáo viên mầm non. Hãy tạo đúng 4 câu hỏi trắc nghiệm bằng tiếng Việt cho trẻ 5–6 tuổi.
                Mục tiêu: đếm số con vật trong phạm vi 5. Chủ đề: %s. Cấp học: %s.
                Mỗi câu mô tả một nhóm con vật đang có ở cùng một nơi, bằng chữ, với tổng từ 1 đến 5.
                Có thể nêu hai nhóm con vật rồi hỏi tổng số. Chỉ hỏi "Có tất cả bao nhiêu con...?".
                Không dùng tình huống con vật chạy đi, đi ngủ, đến thêm hoặc rời khỏi nhóm; không hỏi số còn lại.
                Mỗi câu tối đa hai câu ngắn, dùng từ quen thuộc; nơi chốn và hành động phải nhất quán, không gây hiểu nhầm.
                Không hỏi nhận biết tên, tiếng kêu, thức ăn hoặc nơi sống của con vật.
                Không dùng hình ảnh, không viết câu cần nhìn hình, không dựa vào hình ảnh chưa có.
                Mỗi câu có đúng 4 đáp án là 4 số khác nhau trong khoảng 1–5, viết dưới dạng chuỗi.
                Chỉ một đáp án đúng; correctIndex là vị trí của đáp án đúng, tính từ 0 đến 3.
                Chỉ trả về một object JSON có mảng questions gồm đúng 4 câu.
                Mỗi câu chỉ có text (chuỗi không rỗng), options (4 chuỗi), correctIndex (số nguyên).
                Không tạo ID, itemIndex, timeLimit, point, shareCode, version hoặc status.
                """.formatted(topic, grade);

        return model.chat(prompt);
    }

    public List<QuizAiQuestion> parseSpikeResult(String rawJson) {
        try {
            JsonNode root = objectMapper.readTree(rawJson);
            if (root == null || !root.isObject() || root.size() != 1
                    || !root.path("questions").isArray() || root.path("questions").size() != 4) {
                throw new IllegalArgumentException("Spike requires exactly 4 questions");
            }
            for (int i = 0; i < 4; i++) {
                JsonNode question = root.path("questions").get(i);
                if (!question.isObject() || question.size() != 3
                        || !question.path("text").isTextual() || question.path("text").asText().isBlank()) {
                    throw new IllegalArgumentException("Question " + i + " needs non-blank text");
                }
                JsonNode options = question.path("options");
                if (!options.isArray() || options.size() != 4) {
                    throw new IllegalArgumentException("Question " + i + " needs 4 non-blank options");
                }
                Set<String> seenOptions = new HashSet<>();
                for (JsonNode option : options) {
                    if (!option.isTextual() || !option.asText().matches("[1-5]")
                            || !seenOptions.add(option.asText())) {
                        throw new IllegalArgumentException("Question " + i + " needs 4 distinct number options from 1 to 5");
                    }
                }
                JsonNode correctIndex = question.path("correctIndex");
                if (!correctIndex.isIntegralNumber() || correctIndex.intValue() < 0 || correctIndex.intValue() > 3) {
                    throw new IllegalArgumentException("Question " + i + " needs correctIndex from 0 to 3");
                }
            }
            QuizAiOutput content = objectMapper.readValue(rawJson, QuizAiOutput.class);
            return List.copyOf(content.questions());
        } catch (IllegalArgumentException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException("Gemini returned invalid QUIZ JSON", exception);
        }
    }
}
