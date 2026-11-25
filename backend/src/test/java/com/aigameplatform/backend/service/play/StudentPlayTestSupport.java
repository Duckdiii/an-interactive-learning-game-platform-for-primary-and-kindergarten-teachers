package com.aigameplatform.backend.service.play;

import static org.mockito.Mockito.mock;

import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.GameSessionRepository;
import com.aigameplatform.backend.repository.ParticipantRepository;
import com.aigameplatform.backend.repository.SelfSessionRepository;
import com.aigameplatform.backend.service.play.grading.AudioVisualMatchHandler;
import com.aigameplatform.backend.service.play.grading.OddOneOutImageHandler;
import com.aigameplatform.backend.service.play.grading.DragDropHandler;
import com.aigameplatform.backend.service.play.grading.MatchingHandler;
import com.aigameplatform.backend.service.play.grading.OrderingHandler;
import com.aigameplatform.backend.service.play.grading.PlayRecorder;
import com.aigameplatform.backend.service.play.grading.QuizHandler;
import com.aigameplatform.backend.service.play.grading.SpotTheTargetHandler;
import com.aigameplatform.backend.service.play.grading.VisualClozeImageHandler;
import com.aigameplatform.backend.service.play.grading.VisualClozeTextHandler;
import com.aigameplatform.backend.service.play.grading.WordScrambleHandler;
import com.aigameplatform.backend.service.narration.GameNarrationService;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import java.util.List;
import tools.jackson.databind.json.JsonMapper;

/** Dựng {@link StudentPlayService} với đủ bộ xử lý theo loại game, giống cấu hình Spring. */
final class StudentPlayTestSupport {

    private StudentPlayTestSupport() {
    }

    static StudentPlayService service(GameRepository games, SelfSessionRepository sessions,
            GameSessionRepository liveSessions, ParticipantRepository participants,
            GameContentStrategyRegistry strategies, JsonMapper mapper) {
        return service(games, sessions, liveSessions, participants, strategies, mapper,
                new QuestionClock(java.time.Clock.systemUTC()));
    }

    static StudentPlayService service(GameRepository games, SelfSessionRepository sessions,
            GameSessionRepository liveSessions, ParticipantRepository participants,
            GameContentStrategyRegistry strategies, JsonMapper mapper, QuestionClock questionClock) {
        return service(games, sessions, liveSessions, participants, strategies, mapper, questionClock,
                mock(GameNarrationService.class));
    }

    static StudentPlayService service(GameRepository games, SelfSessionRepository sessions,
            GameSessionRepository liveSessions, ParticipantRepository participants,
            GameContentStrategyRegistry strategies, JsonMapper mapper, GameNarrationService narration) {
        return service(games, sessions, liveSessions, participants, strategies, mapper,
                new QuestionClock(java.time.Clock.systemUTC()), narration);
    }

    static StudentPlayService service(GameRepository games, SelfSessionRepository sessions,
            GameSessionRepository liveSessions, ParticipantRepository participants,
            GameContentStrategyRegistry strategies, JsonMapper mapper, QuestionClock questionClock,
            GameNarrationService narration) {
        PlayRecorder recorder = new PlayRecorder(mapper, sessions, liveSessions);
        return new StudentPlayService(games, sessions, liveSessions, participants, strategies, mapper,
                List.of(new QuizHandler(recorder), new WordScrambleHandler(recorder),
                        new AudioVisualMatchHandler(recorder, mapper), new OddOneOutImageHandler(recorder, mapper),
                        new VisualClozeTextHandler(recorder, mapper), new VisualClozeImageHandler(recorder, mapper),
                        new OrderingHandler(recorder), new DragDropHandler(recorder),
                        new MatchingHandler(recorder, mapper), new SpotTheTargetHandler(recorder)),
                recorder, questionClock, narration);
    }
}
