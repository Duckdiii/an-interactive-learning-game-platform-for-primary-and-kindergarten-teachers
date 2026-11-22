package com.aigameplatform.backend.service.play;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.entity.question.MatchingQuestion;
import com.aigameplatform.backend.entity.question.embedded.MatchingPair;
import com.aigameplatform.backend.entity.question.embedded.PairSide;
import com.aigameplatform.backend.entity.session.Participant;
import com.aigameplatform.backend.entity.session.SelfSession;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.GameSessionRepository;
import com.aigameplatform.backend.repository.ParticipantRepository;
import com.aigameplatform.backend.repository.SelfSessionRepository;
import com.aigameplatform.backend.service.play.insight.MatchingWrongAnswerLabeler;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import com.aigameplatform.backend.service.strategy.MatchingGameStrategy;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Matching qua API học sinh: hai cột mã mờ không lộ cặp, chấm đúng hết hoặc không, nhãn lỗi cho thống kê. */
class StudentPlayMatchingServiceTest {

    private final GameRepository games = mock(GameRepository.class);
    private final SelfSessionRepository sessions = mock(SelfSessionRepository.class);
    private final GameSessionRepository liveSessions = mock(GameSessionRepository.class);
    private final ParticipantRepository participants = mock(ParticipantRepository.class);
    private final GameContentStrategyRegistry strategies = mock(GameContentStrategyRegistry.class);
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final StudentPlayService service =
            StudentPlayTestSupport.service(games, sessions, liveSessions, participants, strategies, mapper);
    private final MatchingQuestion question = new MatchingQuestion();
    private Participant participant;

    @BeforeEach
    void setup() {
        List<MatchingPair> pairs = new ArrayList<>();
        String[][] sides = {{"Mèo", "Meo meo"}, {"Chó", "Gâu gâu"}, {"Bò", "Ùm bò"}, {"Gà", "Ò ó o"}};
        for (int i = 0; i < sides.length; i++) {
            MatchingPair pair = new MatchingPair();
            pair.setPairId("p" + (i + 1));
            pair.setLeft(side(sides[i][0]));
            pair.setRight(side(sides[i][1]));
            pairs.add(pair);
        }
        question.setPairs(pairs);
        question.setId("db-q1");
        question.setItemIndex(0);
        question.setTimeLimit(30);
        question.setPoint(100);
        Game game = new Game();
        game.setGameType(GameType.MATCHING);
        game.setSchemaVersion("1.1.0");
        game.setTitle("Tiếng kêu");
        game.setSubject(Subject.VIETNAMESE);
        game.setGrade(GradeLevel.GRADE_1);
        game.setStatus(GameStatus.PUBLISHED);
        game.setQuestionNum(1);
        game.setQuestions(List.of(question));
        participant = new Participant();
        participant.setId("participant");
        SelfSession session = new SelfSession();
        session.setId("session");
        session.setGame(game);
        session.setStudentOptionSalt("secret-salt");
        session.setStatus(SessionStatus.ACTIVE);
        session.setSessionExpiresAt(LocalDateTime.now().plusHours(1));
        session.setParticipants(List.of(participant));
        doReturn(new MatchingGameStrategy(mapper)).when(strategies).get(GameType.MATCHING);
        when(sessions.findById("session")).thenReturn(Optional.of(session));
        when(sessions.findByIdForUpdate("session")).thenReturn(Optional.of(session));
        when(sessions.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    private PairSide side(String text) {
        PairSide side = new PairSide();
        side.setText(text);
        return side;
    }

    private JsonNode view() {
        return service.questions("session", "participant").get("questions").get(0);
    }

    private String idOf(String column, String text) {
        for (JsonNode item : view().get(column)) if (text.equals(item.get("text").asString())) return item.get("id").asString();
        throw new AssertionError("Missing item " + text);
    }

    private String match(String left, String right) {
        return "{\"leftPairId\":\"%s\",\"rightPairId\":\"%s\"}".formatted(idOf("leftItems", left), idOf("rightItems", right));
    }

    private JsonNode submit(String matches) {
        return mapper.valueToTree(service.interact("session", "participant",
                mapper.readTree("{\"questionId\":\"q1\",\"timeSpentMs\":1000,\"matches\":" + matches + "}")));
    }

    private String all(String chóRight) {
        return "[" + String.join(",", match("Mèo", "Meo meo"), match("Chó", chóRight), match("Bò", "Ùm bò"),
                match("Gà", "Ò ó o")) + "]";
    }

    @Test
    void studentSeesTwoOpaqueColumnsWithoutPairsOrAlignedRows() {
        JsonNode question = view();
        assertThat(question.has("pairs")).isFalse();
        assertThat(question.get("leftItems").size()).isEqualTo(4);
        assertThat(question.get("rightItems").size()).isEqualTo(4);
        assertThat(question.get("leftItems").get(0).get("id").asString()).isEqualTo("l1");
        assertThat(question.get("rightItems").get(3).get("id").asString()).isEqualTo("r4");
        assertThat(view().toString()).isEqualTo(question.toString());
        for (int row = 0; row < 4; row++) {
            String left = question.get("leftItems").get(row).get("text").asString();
            String right = question.get("rightItems").get(row).get("text").asString();
            assertThat(List.of("Mèo|Meo meo", "Chó|Gâu gâu", "Bò|Ùm bò", "Gà|Ò ó o")).doesNotContain(left + "|" + right);
        }
    }

    @Test
    void allCorrectMatchesScore() {
        JsonNode result = submit(all("Gâu gâu"));

        assertThat(result.get("status").asString()).isEqualTo("CORRECT");
        assertThat(result.get("correctAnswer").get("matches").size()).isEqualTo(4);
    }

    @Test
    void wrongOrMissingMatchesAreIncorrectAndWrongOnesGetALabel() {
        JsonNode wrong = submit("[" + String.join(",", match("Mèo", "Gâu gâu"), match("Chó", "Meo meo"), match("Bò", "Ùm bò"),
                match("Gà", "Ò ó o")) + "]");
        assertThat(wrong.get("status").asString()).isEqualTo("INCORRECT");
        String answerJson = participant.getPlayInteractionDetails().get(0).getAnswerJson();
        assertThat(new MatchingWrongAnswerLabeler().label(question, 0, "secret-salt", mapper.readTree(answerJson)))
                .contains("Mèo ↔ Gâu gâu");

        participant.getPlayInteractionDetails().clear();
        participant.setScore(0);
        assertThat(submit("[" + match("Mèo", "Meo meo") + "]").get("status").asString()).isEqualTo("INCORRECT");
    }

    @Test
    void badInputIsRejectedAndSkipDoesNotRevealTheKey() {
        String l1 = idOf("leftItems", "Mèo");
        String r1 = idOf("rightItems", "Meo meo");
        String r2 = idOf("rightItems", "Gâu gâu");
        for (String matches : List.of("[{\"leftPairId\":\"nope\",\"rightPairId\":\"" + r1 + "\"}]",
                "[{\"leftPairId\":\"" + l1 + "\",\"rightPairId\":\"p1\"}]",
                "[{\"leftPairId\":\"" + l1 + "\",\"rightPairId\":\"" + r1 + "\"},{\"leftPairId\":\"" + l1 + "\",\"rightPairId\":\"" + r2 + "\"}]",
                "[{\"leftPairId\":\"" + l1 + "\",\"rightPairId\":\"" + r1 + "\"},{\"leftPairId\":\"" + idOf("leftItems", "Chó")
                        + "\",\"rightPairId\":\"" + r1 + "\"}]",
                "{}")) {
            assertThatThrownBy(() -> submit(matches)).isInstanceOf(ApiException.class);
        }
        assertThat(participant.getPlayInteractionDetails()).isEmpty();

        JsonNode skipped = mapper.valueToTree(service.interact("session", "participant",
                mapper.readTree("{\"questionId\":\"q1\",\"timeSpentMs\":1000,\"outcome\":\"SKIPPED\"}")));
        assertThat(skipped.get("status").asString()).isEqualTo("SKIPPED");
        assertThat(skipped.get("correctAnswer").isNull()).isTrue();
    }
}
