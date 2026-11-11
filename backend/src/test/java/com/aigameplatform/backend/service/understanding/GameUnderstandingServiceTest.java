package com.aigameplatform.backend.service.understanding;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.aigameplatform.backend.dto.request.UnderstandGameRequest;
import com.aigameplatform.backend.dto.understanding.ChatTurn;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.AiGenerationTimeoutException;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.service.generation.AiServiceUnavailableException;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import tools.jackson.databind.json.JsonMapper;

class GameUnderstandingServiceTest {

    private static final JsonMapper MAPPER = JsonMapper.builder().build();

    private static final String CARD = """
            "understanding": {"learningGoal": "So sánh số trong phạm vi 10", "childAction": "Chọn dấu đúng",
              "content": ["3 ... 5", "", "7 ... 2"], "setting": "Bầu trời, bóng bay", "gameType": "CUSTOM",
              "alternativeGameTypes": ["CUSTOM", "QUIZ", "QUIZ", "MATCHING", "ORDERING"],
              "unsupported": [{"need": "Ghi âm giọng bé", "fallback": "Bé nghe rồi chọn"}, {"need": "", "fallback": "x"}],
              "assumptions": ["Phạm vi số trong 10"]}""";

    /** Generator giả: trả lần lượt các chuỗi cho sẵn và nhớ prompt đã nhận. */
    private static final class FakeGenerator implements GameUnderstandingGenerator {
        final List<String> replies;
        final List<String> userPrompts = new ArrayList<>();

        FakeGenerator(String... replies) {
            this.replies = new ArrayList<>(List.of(replies));
        }

        @Override
        public String generate(String systemPrompt, String userPrompt) {
            userPrompts.add(userPrompt);
            return replies.removeFirst();
        }
    }

    private static GameUnderstandingService service(GameUnderstandingGenerator generator) {
        var beans = new StaticListableBeanFactory();
        if (generator != null) beans.addBean("generator", generator);
        return new GameUnderstandingService(beans.getBeanProvider(GameUnderstandingGenerator.class),
                new UnderstandingPromptBuilder(MAPPER), MAPPER);
    }

    private static UnderstandGameRequest request(ChatTurn... turns) {
        return new UnderstandGameRequest(Subject.MATH, GradeLevel.GRADE_1, List.of(turns), null);
    }

    private static ChatTurn teacher(String text) {
        return new ChatTurn(ChatTurn.Role.TEACHER, text);
    }

    private static ChatTurn assistant(String text) {
        return new ChatTurn(ChatTurn.Role.ASSISTANT, text);
    }

    @Test
    void returnsTheCardNormalizedToTheContractLimits() {
        var generator = new FakeGenerator("{\"reply\": \"Em hiểu rồi.\", \"question\": {\"text\": \"\", \"quickReplies\": []}, " + CARD + "}");

        var result = service(generator).understand(request(teacher("Cho bé so sánh số, kiểu bắn bóng bay")));

        assertThat(result.ready()).isTrue();
        assertThat(result.question()).isNull();
        assertThat(result.reply()).isEqualTo("Em hiểu rồi.");
        var card = result.understanding();
        assertThat(card.gameType()).isEqualTo(GameType.CUSTOM);
        assertThat(card.alternativeGameTypes()).containsExactly(GameType.QUIZ, GameType.MATCHING);
        assertThat(card.content()).containsExactly("3 ... 5", "7 ... 2");
        assertThat(card.unsupported()).hasSize(1).first().satisfies(item -> assertThat(item.need()).isEqualTo("Ghi âm giọng bé"));
    }

    @Test
    void aQuestionMakesTheCardNotReadyAndKeepsAtMostFourQuickReplies() {
        var generator = new FakeGenerator("{\"reply\": \"\", \"question\": {\"text\": \"Phạm vi mấy ạ?\", "
                + "\"quickReplies\": [\"Trong 10\", \"Trong 20\", \"Trong 100\", \"Khác\", \"Thừa\"]}, " + CARD + "}");

        var result = service(generator).understand(request(teacher("Cho bé so sánh số")));

        assertThat(result.ready()).isFalse();
        assertThat(result.question().text()).isEqualTo("Phạm vi mấy ạ?");
        assertThat(result.question().quickReplies()).hasSize(4);
        assertThat(result.reply()).isNotBlank();
    }

    @Test
    void afterTwoAssistantTurnsTheQuestionIsDroppedAndThePromptSaysSo() {
        var generator = new FakeGenerator("{\"reply\": \"Ok\", \"question\": {\"text\": \"Hỏi nữa?\", \"quickReplies\": []}, " + CARD + "}");

        var result = service(generator).understand(request(teacher("So sánh số"), assistant("Phạm vi mấy?"),
                teacher("Trong 10"), assistant("Kiểu chơi nào?"), teacher("Bắn bóng")));

        assertThat(result.question()).isNull();
        assertThat(result.ready()).isTrue();
        assertThat(generator.userPrompts.getFirst()).contains("Đã hết lượt hỏi lại");
    }

    @Test
    void retriesOnceWhenTheJsonCannotBeReadThenGivesUp() {
        var recovered = new FakeGenerator("không phải json", "{\"reply\": \"Ok\", \"question\": {\"text\": \"\", \"quickReplies\": []}, " + CARD + "}");
        assertThat(service(recovered).understand(request(teacher("So sánh số"))).ready()).isTrue();

        var broken = new FakeGenerator("{", "{\"reply\": \"thiếu thẻ\"}");
        assertThatThrownBy(() -> service(broken).understand(request(teacher("So sánh số"))))
                .isInstanceOf(AiGenerationTimeoutException.class);
    }

    @Test
    void theLastMessageMustComeFromTheTeacher() {
        assertThatThrownBy(() -> service(new FakeGenerator()).understand(request(teacher("A"), assistant("B"))))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Tin nhắn cuối phải là của giáo viên");
    }

    @Test
    void aiFailureOrMissingConfigurationBecomesTheTimeoutError() {
        GameUnderstandingGenerator failing = (system, user) -> {
            throw new AiServiceUnavailableException("down", new RuntimeException("503"));
        };
        assertThatThrownBy(() -> service(failing).understand(request(teacher("So sánh số"))))
                .isInstanceOf(AiGenerationTimeoutException.class);
        assertThatThrownBy(() -> service(null).understand(request(teacher("So sánh số"))))
                .isInstanceOf(AiGenerationTimeoutException.class);
    }

    @Test
    void aMissingGameTypeFallsBackToQuizAndLongTextsAreCut() {
        String longGoal = "a".repeat(300);
        var generator = new FakeGenerator("{\"reply\": \"Ok\", \"question\": {\"text\": \"\", \"quickReplies\": []}, "
                + "\"understanding\": {\"learningGoal\": \"" + longGoal + "\", \"content\": null}}");

        var card = service(generator).understand(request(teacher("Ôn bài"))).understanding();

        assertThat(card.gameType()).isEqualTo(GameType.QUIZ);
        assertThat(card.learningGoal()).hasSize(200);
        assertThat(card.content()).isEmpty();
        assertThat(card.setting()).isEmpty();
    }
}
