package com.aigameplatform.backend.service.play;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.OddOneOutMode;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.repository.GameSessionRepository;
import com.aigameplatform.backend.repository.SelfSessionRepository;
import com.aigameplatform.backend.service.play.grading.AudioVisualMatchHandler;
import com.aigameplatform.backend.service.play.grading.OddOneOutImageHandler;
import com.aigameplatform.backend.service.play.grading.DragDropHandler;
import com.aigameplatform.backend.service.play.grading.MatchingHandler;
import com.aigameplatform.backend.service.play.grading.MemoryCardHandler;
import com.aigameplatform.backend.service.play.grading.OrderingHandler;
import com.aigameplatform.backend.service.play.grading.PlayRecorder;
import com.aigameplatform.backend.service.play.grading.QuizHandler;
import com.aigameplatform.backend.service.play.grading.SpotTheTargetHandler;
import com.aigameplatform.backend.service.play.grading.StudentGameHandler;
import com.aigameplatform.backend.service.play.grading.VisualClozeImageHandler;
import com.aigameplatform.backend.service.play.grading.VisualClozeTextHandler;
import com.aigameplatform.backend.service.play.grading.WordScrambleHandler;
import java.util.List;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

/** Mỗi game được đúng một bộ xử lý (hoặc không có nếu API nộp đáp án chưa hỗ trợ loại đó); thêm loại mới không sửa lớp điều phối. */
class StudentGameHandlerRoutingTest {

    private final JsonMapper mapper = JsonMapper.builder().build();
    private final PlayRecorder recorder =
            new PlayRecorder(mapper, mock(SelfSessionRepository.class), mock(GameSessionRepository.class));
    private final List<StudentGameHandler> handlers = List.of(new QuizHandler(recorder), new WordScrambleHandler(recorder),
            new AudioVisualMatchHandler(recorder, mapper), new OddOneOutImageHandler(recorder, mapper),
            new VisualClozeTextHandler(recorder, mapper), new VisualClozeImageHandler(recorder, mapper),
            new OrderingHandler(recorder), new DragDropHandler(recorder), new MatchingHandler(recorder, mapper),
            new SpotTheTargetHandler(recorder), new MemoryCardHandler(recorder));

    private Game game(GameType type, OddOneOutMode odd, VisualClozeMode cloze) {
        Game game = new Game();
        game.setGameType(type);
        game.setOddOneOutMode(odd);
        game.setVisualClozeMode(cloze);
        return game;
    }

    private long matches(Game game) {
        return handlers.stream().filter(handler -> handler.supports(game)).count();
    }

    @Test
    void noGameIsClaimedByMoreThanOneHandler() {
        for (GameType type : GameType.values()) {
            for (OddOneOutMode odd : new OddOneOutMode[] {null, OddOneOutMode.TEXT, OddOneOutMode.IMAGE}) {
                for (VisualClozeMode cloze : new VisualClozeMode[] {null, VisualClozeMode.TEXT, VisualClozeMode.IMAGE}) {
                    assertThat(matches(game(type, odd, cloze))).as("%s odd=%s cloze=%s", type, odd, cloze).isLessThanOrEqualTo(1);
                }
            }
        }
    }

    @Test
    void supportedGamesHaveExactlyOneHandler() {
        assertThat(matches(game(GameType.QUIZ, null, null))).isEqualTo(1);
        assertThat(matches(game(GameType.WORD_SCRAMBLE, null, null))).isEqualTo(1);
        assertThat(matches(game(GameType.AUDIO_VISUAL_MATCH, null, null))).isEqualTo(1);
        assertThat(matches(game(GameType.ORDERING, null, null))).isEqualTo(1);
        assertThat(matches(game(GameType.MATCHING, null, null))).isEqualTo(1);
        assertThat(matches(game(GameType.MEMORY_CARD, null, null))).isEqualTo(1);
        assertThat(matches(game(GameType.SPOT_THE_TARGET, null, null))).isEqualTo(1);
        assertThat(matches(game(GameType.DRAG_DROP, null, null))).isEqualTo(1);
        assertThat(matches(game(GameType.ODD_ONE_OUT, OddOneOutMode.IMAGE, null))).isEqualTo(1);
        // Không đặt chế độ thì Visual Cloze là nhập chữ (mặc định của Game).
        assertThat(matches(game(GameType.VISUAL_CLOZE, null, null))).isEqualTo(1);
        assertThat(matches(game(GameType.VISUAL_CLOZE, null, VisualClozeMode.IMAGE))).isEqualTo(1);
    }

    @Test
    void gamesTheApiCannotGradeYetHaveNoHandler() {
        assertThat(matches(game(GameType.ODD_ONE_OUT, OddOneOutMode.TEXT, null))).isZero();

    }
}
