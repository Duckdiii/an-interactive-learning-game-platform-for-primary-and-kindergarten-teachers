package com.aigameplatform.backend.service.play.grading;

import static com.aigameplatform.backend.service.play.grading.PlayInputs.integer;
import static com.aigameplatform.backend.service.play.grading.PlayInputs.validation;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.question.MemoryCardQuestion;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.embedded.MemoryPair;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ObjectNode;

@Component
public class MemoryCardHandler implements StudentGameHandler {
    private final PlayRecorder recorder;

    public MemoryCardHandler(PlayRecorder recorder) {
        this.recorder = recorder;
    }

    @Override
    public boolean supports(Game game) {
        return game.getGameType() == GameType.MEMORY_CARD;
    }

    @Override
    public void redact(RedactContext context, ObjectNode node, QuestionGame question, int index) {
        // Both cards are copies of the same face. Pair IDs are part of the student board.
    }

    @Override
    public Map<String, Object> grade(GradeContext context) {
        if (context.outcome() != null) return recorder.recordGraded(context, Map.of(), Map.of(), false);
        List<String> expected = ((MemoryCardQuestion) context.question()).getPairs().stream().map(MemoryPair::getPairId).toList();
        Set<String> available = Set.copyOf(expected);
        JsonNode matches = context.request().path("matchedPairIds");
        if (!matches.isArray() || matches.size() > available.size()) throw validation("Invalid matchedPairIds");
        Set<String> matched = new LinkedHashSet<>();
        for (JsonNode pair : matches) {
            if (!pair.isString() || !available.contains(pair.asString()) || !matched.add(pair.asString()))
                throw validation("matchedPairIds must contain distinct known pairs");
        }

        int flips = integer(context.request(), "flips", -1);
        if (flips < matched.size() * 2) throw validation("Invalid flip count");
        Set<List<String>> wrong = new LinkedHashSet<>();
        JsonNode attempts = context.request().path("wrongPairs");
        if (!attempts.isMissingNode()) {
            if (!attempts.isArray() || attempts.size() > available.size() * (available.size() - 1) / 2
                    || (long) (matched.size() + attempts.size()) * 2 > flips)
                throw validation("Invalid wrongPairs");
            for (JsonNode pair : attempts) {
                if (!pair.isArray() || pair.size() != 2 || !pair.get(0).isString() || !pair.get(1).isString())
                    throw validation("Each wrong pair must contain two card IDs");
                String a = pair.get(0).asString();
                String b = pair.get(1).asString();
                if (!available.contains(a) || !available.contains(b) || a.equals(b))
                    throw validation("Wrong pairs must use two distinct known cards");
                wrong.add(a.compareTo(b) < 0 ? List.of(a, b) : List.of(b, a));
            }
        }
        return recorder.recordGraded(context, Map.of("matchedPairIds", matched, "flips", flips, "wrongPairs", wrong),
                Map.of("matchedPairIds", expected), matched.equals(available));
    }
}
