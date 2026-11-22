package com.aigameplatform.backend.service.play.grading;

import static com.aigameplatform.backend.service.play.grading.PlayInputs.opaque;
import static com.aigameplatform.backend.service.play.grading.PlayInputs.orderingKey;
import static com.aigameplatform.backend.service.play.grading.PlayInputs.text;
import static com.aigameplatform.backend.service.play.grading.PlayInputs.validation;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.InteractionStatus;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.entity.interaction.PlayInteractionDetail;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.VisualClozeQuestion;
import com.aigameplatform.backend.entity.session.Participant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * Visual Cloze dạng ảnh: mỗi lần nộp một cặp ô trống và ảnh (mã mờ). Cặp đúng được giữ lại ({@code IN_PROGRESS}), cặp
 * sai trả {@code INCORRECT} và cho thử lại; chỉ khi đủ mọi ô thì mới {@code CORRECT} và lộ ánh xạ đúng.
 */
@Component
public class VisualClozeImageHandler implements StudentGameHandler {

    private final PlayRecorder recorder;
    private final JsonMapper mapper;

    public VisualClozeImageHandler(PlayRecorder recorder, JsonMapper mapper) {
        this.recorder = recorder;
        this.mapper = mapper;
    }

    @Override
    public boolean supports(Game game) {
        return game.getGameType() == GameType.VISUAL_CLOZE && game.effectiveVisualClozeMode() == VisualClozeMode.IMAGE;
    }

    @Override
    public void redact(RedactContext context, ObjectNode node, QuestionGame base, int index) {
        VisualClozeQuestion question = (VisualClozeQuestion) base;
        String salt = context.salt();
        if (node.get("blanks") instanceof ArrayNode blanks) for (JsonNode value : blanks) {
            ObjectNode blank = (ObjectNode) value;
            blank.put("id", opaque(salt, index, "blank:" + blank.get("id").asString()));
            blank.remove("correctOptionId");
        }
        if (node.get("options") instanceof ArrayNode options) {
            List<ObjectNode> randomized = new ArrayList<>();
            for (JsonNode value : options) {
                ObjectNode option = (ObjectNode) value;
                option.put("id", opaque(salt, index, "option:" + option.get("id").asString()));
                randomized.add(option);
            }
            randomized.sort(Comparator.comparing(option -> orderingKey(salt, index, option.get("id").asString())));
            node.set("options", mapper.valueToTree(randomized));
        }
        // Tải lại giữa chừng: trả các cặp đúng đã nhận và thời gian đã trôi để học sinh tiếp tục đúng chỗ.
        context.participant().getPlayInteractionDetails().stream()
                .filter(detail -> detail.getQuestion().getId().equals(question.getId())
                        && detail.getStatus() == InteractionStatus.IN_PROGRESS)
                .findFirst().ifPresent(detail -> {
                    node.set("acceptedPlacements", mapper.valueToTree(placements(progressPlacements(detail))));
                    node.put("elapsedTimeMs", detail.getTimeSpentMs());
                });
    }

    @Override
    public Map<String, Object> grade(GradeContext c) {
        VisualClozeQuestion question = (VisualClozeQuestion) c.question();
        Participant participant = c.participant();
        PlayInteractionDetail detail = c.existing();
        Map<String, String> expected = publicMapping(question, c.salt(), c.index());
        Map<String, String> accepted = detail == null ? new LinkedHashMap<>() : progressPlacements(detail);
        if (c.outcome() != null || PlayRecorder.isOverTime(question, c.timeSpentMs())) {
            InteractionStatus terminal = "TIMEOUT".equals(c.outcome()) || PlayRecorder.isOverTime(question, c.timeSpentMs())
                    ? InteractionStatus.TIMEOUT : InteractionStatus.SKIPPED;
            PlayInteractionDetail saved = prepareDetail(detail, question, c.timeSpentMs());
            saved.setStatus(terminal);
            saved.setPointsEarned(0);
            saved.setAnswerJson(mapper.valueToTree(Map.of("placements", placements(accepted), "outcome", terminal.name())).toString());
            saved.setCorrectAnswerJson(null);
            attachIfNew(participant, detail, saved);
            recorder.markCompletedIfTerminal(participant, c.session().getGame());
            recorder.save(c.session());
            return imageResult(saved, participant, terminal, false, false, null);
        }

        Map<String, String> submitted = parsePlacements(c.request().get("placements"));
        if (submitted.size() != 1) throw validation("placements must contain exactly one blank placement for IMAGE mode");
        var placement = submitted.entrySet().iterator().next();
        String blankId = placement.getKey();
        String optionId = placement.getValue();
        Set<String> availableOptions = question.getOptions().stream()
                .map(option -> opaque(c.salt(), c.index(), "option:" + option.getOptionId()))
                .collect(Collectors.toSet());
        if (!expected.containsKey(blankId) || !availableOptions.contains(optionId))
            throw validation("placement must use a known blank and option");
        if (accepted.containsKey(blankId)) {
            if (!optionId.equals(accepted.get(blankId))) throw validation("A correctly filled blank cannot be changed");
            return imageResult(detail, participant, InteractionStatus.IN_PROGRESS, true, true, null);
        }
        if (accepted.containsValue(optionId)) throw validation("A correctly placed option cannot be reused");

        boolean placementCorrect = optionId.equals(expected.get(blankId));
        if (placementCorrect) accepted.put(blankId, optionId);
        boolean complete = placementCorrect && accepted.size() == expected.size();
        InteractionStatus responseStatus = complete ? InteractionStatus.CORRECT
                : placementCorrect ? InteractionStatus.IN_PROGRESS : InteractionStatus.INCORRECT;
        PlayInteractionDetail saved = prepareDetail(detail, question, c.timeSpentMs());
        saved.setStatus(complete ? InteractionStatus.CORRECT : InteractionStatus.IN_PROGRESS);
        saved.setPointsEarned(complete ? PlayRecorder.points(question, c.timeSpentMs()) : 0);
        saved.setAnswerJson(mapper.valueToTree(Map.of("placements", placements(accepted))).toString());
        saved.setCorrectAnswerJson(complete ? mapper.valueToTree(Map.of("placements", placements(expected))).toString() : null);
        attachIfNew(participant, detail, saved);
        if (complete) participant.setScore(participant.getScore() + saved.getPointsEarned());
        recorder.markCompletedIfTerminal(participant, c.session().getGame());
        recorder.save(c.session());
        return imageResult(saved, participant, responseStatus, placementCorrect, !complete,
                complete ? mapper.valueToTree(Map.of("placements", placements(expected))) : null);
    }

    private PlayInteractionDetail prepareDetail(PlayInteractionDetail existing, VisualClozeQuestion question, int timeSpentMs) {
        PlayInteractionDetail detail = existing == null ? new PlayInteractionDetail() : existing;
        detail.setQuestion(question);
        detail.setAttemptsCount(detail.getAttemptsCount() + 1);
        detail.setTimeSpentMs(timeSpentMs);
        detail.setDurationSeconds((int) Math.ceil(timeSpentMs / 1000d));
        return detail;
    }

    private void attachIfNew(Participant participant, PlayInteractionDetail previous, PlayInteractionDetail next) {
        if (previous == null) participant.getPlayInteractionDetails().add(next);
    }

    private Map<String, Object> imageResult(PlayInteractionDetail detail, Participant participant, InteractionStatus status,
            boolean placementCorrect, boolean retryable, JsonNode correctAnswer) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", status.name());
        result.put("isCorrect", placementCorrect);
        result.put("placementCorrect", placementCorrect);
        result.put("retryable", retryable);
        result.put("pointsEarned", detail.getPointsEarned());
        result.put("totalScore", participant.getScore());
        result.put("correctAnswer", correctAnswer);
        result.put("explanation", null);
        return result;
    }

    private Map<String, String> publicMapping(VisualClozeQuestion question, String salt, int index) {
        Map<String, String> mapping = new LinkedHashMap<>();
        for (var blank : question.getBlanks()) mapping.put(opaque(salt, index, "blank:" + blank.getBlankId()),
                opaque(salt, index, "option:" + blank.getCorrectOptionId()));
        return mapping;
    }

    private List<Map<String, String>> placements(Map<String, String> values) {
        return values.entrySet().stream().map(entry -> Map.of("blankId", entry.getKey(), "optionId", entry.getValue())).toList();
    }

    private Map<String, String> parsePlacements(JsonNode node) {
        if (!(node instanceof ArrayNode array)) throw validation("placements must be an array");
        Map<String, String> result = new LinkedHashMap<>();
        Set<String> options = new LinkedHashSet<>();
        for (JsonNode pair : array) {
            String blankId = text(pair, "blankId");
            String optionId = text(pair, "optionId");
            if (blankId == null || optionId == null || result.putIfAbsent(blankId, optionId) != null
                    || !options.add(optionId)) throw validation("placements contain missing or duplicate IDs");
        }
        return result;
    }

    private Map<String, String> progressPlacements(PlayInteractionDetail detail) {
        if (detail == null || detail.getAnswerJson() == null) return new LinkedHashMap<>();
        try {
            JsonNode progress = mapper.readTree(detail.getAnswerJson());
            JsonNode placements = progress == null ? null : progress.get("placements");
            return placements == null ? new LinkedHashMap<>() : parsePlacements(placements);
        } catch (JacksonException invalid) {
            throw new IllegalStateException("Stored placement progress is unreadable", invalid);
        }
    }
}
