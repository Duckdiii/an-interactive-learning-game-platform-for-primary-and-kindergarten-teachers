package com.aigameplatform.backend.service.play;

import com.aigameplatform.backend.dto.dsl.VisualClozeGameDsl;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.GameType;
import com.aigameplatform.backend.entity.enums.InteractionStatus;
import com.aigameplatform.backend.entity.enums.SessionStatus;
import com.aigameplatform.backend.entity.enums.VisualClozeMode;
import com.aigameplatform.backend.entity.interaction.PlayInteractionDetail;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.question.AudioVisualMatchQuestion;
import com.aigameplatform.backend.entity.question.OddOneOutQuestion;
import com.aigameplatform.backend.entity.question.VisualClozeQuestion;
import com.aigameplatform.backend.entity.session.Participant;
import com.aigameplatform.backend.entity.session.SelfSession;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.SelfSessionRepository;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;
import tools.jackson.databind.json.JsonMapper;

@Service
public class StudentPlayService {
    private final GameRepository games;
    private final SelfSessionRepository sessions;
    private final GameContentStrategyRegistry strategies;
    private final JsonMapper mapper;
    private final SecureRandom secureRandom = new SecureRandom();

    public StudentPlayService(GameRepository games, SelfSessionRepository sessions,
            GameContentStrategyRegistry strategies, JsonMapper mapper) {
        this.games = games;
        this.sessions = sessions;
        this.strategies = strategies;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> sharedGame(String shareCode) {
        Game game = publishedGame(shareCode);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("gameTitle", game.getTitle());
        result.put("gameType", game.getGameType().name());
        result.put("questionCount", game.getQuestionNum());
        result.put("metadata", Map.of("title", game.getTitle(), "subject", game.getSubject().name(),
                "gradeLevel", game.getGrade().name(), "topic",
                game.getTopic() == null || game.getTopic().isBlank() ? game.getTitle() : game.getTopic()));
        result.put("uiOverride", "AUTO");
        result.put("themeId", null);
        return result;
    }

    @Transactional
    public Map<String, Object> start(String shareCode, String nickname) {
        Game game = publishedGame(shareCode);
        if (nickname == null || nickname.isBlank() || nickname.length() > 20)
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Nickname must contain 1 to 20 characters");
        SelfSession session = new SelfSession();
        session.setGame(game);
        session.setSessionName("Self practice");
        session.setStatus(SessionStatus.ACTIVE);
        session.setStudentOptionSalt(randomSalt());
        session.setSessionExpiresAt(LocalDateTime.now().plusHours(24));
        Participant participant = new Participant();
        participant.setStudentNickname(nickname.trim());
        participant.setPlayedAt(LocalDateTime.now());
        session.setParticipants(new ArrayList<>(List.of(participant)));
        SelfSession saved = sessions.saveAndFlush(session);
        return Map.of("sessionId", saved.getId(), "participantId", participant.getId(), "nickname",
                participant.getStudentNickname(), "sessionType", "SELF", "status", "ACTIVE",
                "expiresAt", saved.getSessionExpiresAt().toString());
    }

    @Transactional(readOnly = true)
    public ObjectNode questions(String sessionId, String participantId) {
        SelfSession session = activeSession(sessionId, participantId, false);
        Game game = session.getGame();
        boolean oddImage = game.getGameType() == GameType.ODD_ONE_OUT
                && game.getOddOneOutMode() == com.aigameplatform.backend.entity.enums.OddOneOutMode.IMAGE;
        if (game.getGameType() != GameType.VISUAL_CLOZE && game.getGameType() != GameType.AUDIO_VISUAL_MATCH && !oddImage)
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "SELF player API does not support this game type");
        var dsl = strategies.get(game.getGameType()).toGameDsl(game);
        ObjectNode response = mapper.valueToTree(dsl);
        ArrayNode questionNodes = (ArrayNode) response.get("questions");
        for (int i = 0; i < questionNodes.size(); i++) {
            ObjectNode questionNode = (ObjectNode) questionNodes.get(i);
            if (game.getGameType() == GameType.AUDIO_VISUAL_MATCH) {
                redactAudioVisualQuestion(questionNode, (AudioVisualMatchQuestion) game.getQuestions().get(i),
                        session.getStudentOptionSalt(), i);
                continue;
            }
            if (oddImage) {
                redactOddImageQuestion(questionNode, session.getStudentOptionSalt(), i);
                continue;
            }
            VisualClozeQuestion question = (VisualClozeQuestion) game.getQuestions().get(i);
            if (((VisualClozeGameDsl) dsl).effectiveMode() == VisualClozeMode.IMAGE) {
                redactImageQuestion(questionNode, question, session.getStudentOptionSalt(), i);
                participant(session, participantId).getPlayInteractionDetails().stream()
                        .filter(detail -> detail.getQuestion().getId().equals(question.getId())
                                && detail.getStatus() == InteractionStatus.IN_PROGRESS)
                        .findFirst().ifPresent(detail -> {
                            questionNode.set("acceptedPlacements", mapper.valueToTree(placements(progressPlacements(detail))));
                            questionNode.put("elapsedTimeMs", detail.getTimeSpentMs());
                        });
            }
            else redactTextQuestion(questionNode, question, session.getStudentOptionSalt(), i);
        }
        ArrayNode answered = mapper.createArrayNode();
        Participant participant = participant(session, participantId);
        participant.getPlayInteractionDetails().stream()
                .filter(detail -> detail.getStatus() != InteractionStatus.IN_PROGRESS)
                .map(detail -> "q" + (detail.getQuestion().getItemIndex() + 1)).sorted().forEach(answered::add);
        response.set("answeredQuestionIds", answered);
        return response;
    }

    @Transactional
    public Map<String, Object> interact(String sessionId, String participantId, JsonNode request) {
        SelfSession session = activeSession(sessionId, participantId, true);
        Participant participant = participant(session, participantId);
        if (request == null || !request.isObject()) throw validation("Interaction body must be an object");
        String questionId = text(request, "questionId");
        int timeSpentMs = integer(request, "timeSpentMs", -1);
        if (questionId == null || !questionId.matches("q[1-9][0-9]*") || timeSpentMs < 0 || timeSpentMs > 3_600_000)
            throw validation("questionId or timeSpentMs is invalid");
        int index;
        try { index = Integer.parseInt(questionId.substring(1)) - 1; }
        catch (NumberFormatException invalid) { throw validation("questionId is invalid"); }
        Game game = session.getGame();
        boolean oddImage = game.getGameType() == GameType.ODD_ONE_OUT
                && game.getOddOneOutMode() == com.aigameplatform.backend.entity.enums.OddOneOutMode.IMAGE;
        if ((!Set.of(GameType.VISUAL_CLOZE, GameType.AUDIO_VISUAL_MATCH).contains(game.getGameType()) && !oddImage)
                || index >= game.getQuestions().size())
            throw notFound();
        QuestionGame base = game.getQuestions().get(index);
        PlayInteractionDetail existing = participant.getPlayInteractionDetails().stream()
                .filter(detail -> detail.getQuestion().getId().equals(base.getId())).findFirst().orElse(null);
        if (existing != null && existing.getStatus() != InteractionStatus.IN_PROGRESS) return result(existing, participant);
        String outcome = text(request, "outcome");
        if (outcome != null && !Set.of("TIMEOUT", "SKIPPED").contains(outcome))
            throw validation("outcome must be TIMEOUT or SKIPPED");
        if (base instanceof AudioVisualMatchQuestion question && game.getGameType() == GameType.AUDIO_VISUAL_MATCH)
            return interactAudioVisual(session, participant, question, index, request, outcome, timeSpentMs);
        if (base instanceof OddOneOutQuestion question && oddImage) {
            Set<String> available = new java.util.HashSet<>();
            for (int i = 0; i < question.getImageItems().size(); i++)
                available.add(opaque(session.getStudentOptionSalt(), index,
                        "odd:" + com.aigameplatform.backend.service.factory.Ids.positional(i)));
            return interactSingleChoice(session, participant, question, request, outcome, timeSpentMs,
                    "selectedItemId", available,
                    opaque(session.getStudentOptionSalt(), index, "odd:" + question.getOddOneOutId()));
        }
        if (!(base instanceof VisualClozeQuestion question)) throw notFound();
        if (session.getGame().effectiveVisualClozeMode() == VisualClozeMode.IMAGE)
            return interactImage(session, participant, question, index, existing, request, outcome, timeSpentMs);

        JsonNode answerNode;
        JsonNode correctNode;
        boolean correct;
        {
            String answer = text(request, "answer");
            if (outcome == null && answer == null) throw validation("answer is required for TEXT Visual Cloze");
            answerNode = outcome == null ? mapper.valueToTree(Map.of("answer", answer))
                    : mapper.valueToTree(Map.of("outcome", outcome));
            correctNode = mapper.valueToTree(Map.of("answer", question.getCorrectAnswer()));
            correct = outcome == null && normalize(answer).equals(normalize(question.getCorrectAnswer()));
        }
        boolean timeout = "TIMEOUT".equals(outcome) || timeSpentMs > question.getTimeLimit() * 1000L + 1000L;
        InteractionStatus status = timeout ? InteractionStatus.TIMEOUT
                : "SKIPPED".equals(outcome) ? InteractionStatus.SKIPPED
                : correct ? InteractionStatus.CORRECT : InteractionStatus.INCORRECT;
        int points = status == InteractionStatus.CORRECT
                ? (int) Math.round(question.getPoint() * (1 - 0.5 * Math.min(1d, (double) timeSpentMs / (question.getTimeLimit() * 1000d))))
                : 0;
        PlayInteractionDetail detail = new PlayInteractionDetail();
        detail.setQuestion(question);
        detail.setStatus(status);
        detail.setAttemptsCount(1);
        detail.setTimeSpentMs(timeSpentMs);
        detail.setDurationSeconds((int) Math.ceil(timeSpentMs / 1000d));
        detail.setPointsEarned(points);
        detail.setAnswerJson(answerNode.toString());
        detail.setCorrectAnswerJson(correctNode.toString());
        participant.getPlayInteractionDetails().add(detail);
        participant.setScore(participant.getScore() + points);
        if (participant.getPlayInteractionDetails().size() == game.getQuestions().size()) participant.setCompletedAt(LocalDateTime.now());
        sessions.save(session);
        return result(detail, participant);
    }

    private Map<String, Object> interactAudioVisual(SelfSession session, Participant participant,
            AudioVisualMatchQuestion question, int index, JsonNode request, String outcome, int timeSpentMs) {
        String salt = session.getStudentOptionSalt();
        Set<String> available = new java.util.HashSet<>();
        for (int i = 0; i <= question.getDistractors().size(); i++) available.add(opaque(salt, index, "avm:" + i));
        return interactSingleChoice(session, participant, question, request, outcome, timeSpentMs,
                "selectedOptionId", available, opaque(salt, index, "avm:0"));
    }

    private Map<String, Object> interactSingleChoice(SelfSession session, Participant participant,
            QuestionGame question, JsonNode request, String outcome, int timeSpentMs, String field,
            Set<String> available, String correctId) {
        String selected = text(request, field);
        if (outcome == null && (selected == null || !available.contains(selected)))
            throw validation(field + " must identify an available option");
        boolean timeout = "TIMEOUT".equals(outcome) || timeSpentMs > question.getTimeLimit() * 1000L + 1000L;
        InteractionStatus status = timeout ? InteractionStatus.TIMEOUT
                : "SKIPPED".equals(outcome) ? InteractionStatus.SKIPPED
                : correctId.equals(selected) ? InteractionStatus.CORRECT : InteractionStatus.INCORRECT;
        int points = status == InteractionStatus.CORRECT
                ? (int) Math.round(question.getPoint() * (1 - 0.5 * Math.min(1d,
                        (double) timeSpentMs / (question.getTimeLimit() * 1000d)))) : 0;
        PlayInteractionDetail detail = new PlayInteractionDetail();
        detail.setQuestion(question);
        detail.setStatus(status);
        detail.setAttemptsCount(1);
        detail.setTimeSpentMs(timeSpentMs);
        detail.setDurationSeconds((int) Math.ceil(timeSpentMs / 1000d));
        detail.setPointsEarned(points);
        detail.setAnswerJson(mapper.valueToTree(outcome == null ? Map.of(field, selected)
                : Map.of("outcome", outcome)).toString());
        detail.setCorrectAnswerJson(status == InteractionStatus.CORRECT || status == InteractionStatus.INCORRECT
                ? mapper.valueToTree(Map.of(field, correctId)).toString() : null);
        participant.getPlayInteractionDetails().add(detail);
        participant.setScore(participant.getScore() + points);
        markCompletedIfTerminal(participant, session.getGame());
        sessions.save(session);
        return result(detail, participant);
    }

    private void redactOddImageQuestion(ObjectNode node, String salt, int index) {
        node.remove("oddOneOutId");
        node.put("renderMode", "IMAGE");
        List<ObjectNode> options = new ArrayList<>();
        for (JsonNode value : (ArrayNode) node.get("items")) {
            ObjectNode option = (ObjectNode) value;
            option.put("id", opaque(salt, index, "odd:" + option.get("id").asString()));
            options.add(option);
        }
        options.sort(Comparator.comparing(option -> orderingKey(salt, index, option.get("id").asString())));
        node.set("items", mapper.valueToTree(options));
    }

    private void redactAudioVisualQuestion(ObjectNode node, AudioVisualMatchQuestion question, String salt, int index) {
        node.remove(List.of("correct", "distractors", "visualPrompt", "imageUrl"));
        var choices = new ArrayList<com.aigameplatform.backend.entity.question.embedded.ImageChoice>();
        choices.add(question.getCorrect());
        choices.addAll(question.getDistractors());
        List<ObjectNode> options = new ArrayList<>();
        for (int i = 0; i < choices.size(); i++) {
            var choice = choices.get(i);
            ObjectNode option = mapper.createObjectNode();
            option.put("id", opaque(salt, index, "avm:" + i));
            option.put("visualPrompt", choice.getVisualPrompt());
            if (choice.getImageUrl() != null) option.put("imageUrl", choice.getImageUrl());
            options.add(option);
        }
        options.sort(Comparator.comparing(option -> orderingKey(salt, index, option.get("id").asString())));
        node.set("options", mapper.valueToTree(options));
    }

    private Map<String, Object> interactImage(SelfSession session, Participant participant, VisualClozeQuestion question,
            int questionIndex, PlayInteractionDetail detail, JsonNode request, String outcome, int timeSpentMs) {
        Map<String, String> expected = publicMapping(question, session.getStudentOptionSalt(), questionIndex);
        Map<String, String> accepted = detail == null ? new LinkedHashMap<>() : progressPlacements(detail);
        if (outcome != null || timeSpentMs > question.getTimeLimit() * 1000L + 1000L) {
            InteractionStatus terminal = "TIMEOUT".equals(outcome) || timeSpentMs > question.getTimeLimit() * 1000L + 1000L
                    ? InteractionStatus.TIMEOUT : InteractionStatus.SKIPPED;
            PlayInteractionDetail saved = prepareDetail(detail, question, timeSpentMs);
            saved.setStatus(terminal);
            saved.setPointsEarned(0);
            saved.setAnswerJson(mapper.valueToTree(Map.of("placements", placements(accepted), "outcome", terminal.name())).toString());
            saved.setCorrectAnswerJson(null);
            attachDetailIfNew(participant, detail, saved);
            markCompletedIfTerminal(participant, session.getGame());
            sessions.save(session);
            return imageResult(saved, participant, terminal, false, false, null);
        }

        Map<String, String> submitted = parsePlacements(request.get("placements"));
        if (submitted.size() != 1) throw validation("placements must contain exactly one blank placement for IMAGE mode");
        var placement = submitted.entrySet().iterator().next();
        String blankId = placement.getKey();
        String optionId = placement.getValue();
        Set<String> availableOptions = question.getOptions().stream()
                .map(option -> opaque(session.getStudentOptionSalt(), questionIndex, "option:" + option.getOptionId()))
                .collect(java.util.stream.Collectors.toSet());
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
        PlayInteractionDetail saved = prepareDetail(detail, question, timeSpentMs);
        saved.setStatus(complete ? InteractionStatus.CORRECT : InteractionStatus.IN_PROGRESS);
        saved.setPointsEarned(complete ? points(question, timeSpentMs) : 0);
        saved.setAnswerJson(mapper.valueToTree(Map.of("placements", placements(accepted))).toString());
        saved.setCorrectAnswerJson(complete ? mapper.valueToTree(Map.of("placements", placements(expected))).toString() : null);
        attachDetailIfNew(participant, detail, saved);
        if (complete) participant.setScore(participant.getScore() + saved.getPointsEarned());
        markCompletedIfTerminal(participant, session.getGame());
        sessions.save(session);
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

    private void attachDetailIfNew(Participant participant, PlayInteractionDetail previous, PlayInteractionDetail next) {
        if (previous == null) participant.getPlayInteractionDetails().add(next);
    }

    private void markCompletedIfTerminal(Participant participant, Game game) {
        long terminalCount = participant.getPlayInteractionDetails().stream()
                .filter(detail -> detail.getStatus() != InteractionStatus.IN_PROGRESS).count();
        if (terminalCount >= game.getQuestions().size() && participant.getCompletedAt() == null)
            participant.setCompletedAt(LocalDateTime.now());
    }

    private int points(VisualClozeQuestion question, int timeSpentMs) {
        return (int) Math.round(question.getPoint() * (1 - 0.5 * Math.min(1d,
                (double) timeSpentMs / (question.getTimeLimit() * 1000d))));
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

    private void redactImageQuestion(ObjectNode node, VisualClozeQuestion question, String salt, int index) {
        if (node.get("blanks") instanceof ArrayNode blanks) for (JsonNode value : blanks) {
            ObjectNode blank = (ObjectNode) value;
            String id = blank.get("id").asString();
            blank.put("id", opaque(salt, index, "blank:" + id));
            blank.remove("correctOptionId");
        }
        if (node.get("options") instanceof ArrayNode options) {
            List<ObjectNode> randomized = new ArrayList<>();
            for (JsonNode value : options) {
                ObjectNode option = (ObjectNode) value;
                String id = option.get("id").asString();
                option.put("id", opaque(salt, index, "option:" + id));
                randomized.add(option);
            }
            randomized.sort(Comparator.comparing(option -> orderingKey(salt, index, option.get("id").asString())));
            node.set("options", mapper.valueToTree(randomized));
        }
    }

    private void redactTextQuestion(ObjectNode node, VisualClozeQuestion question, String salt, int index) {
        node.remove("correctAnswer");
        node.remove("distractors");
        List<String> choices = new ArrayList<>();
        choices.add(question.getCorrectAnswer());
        choices.addAll(question.getDistractors());
        choices.sort(Comparator.comparing(value -> orderingKey(salt, index, value)));
        node.set("options", mapper.valueToTree(choices));
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

    private Map<String, Object> result(PlayInteractionDetail detail, Participant participant) {
        JsonNode correct;
        try { correct = detail.getCorrectAnswerJson() == null ? null : mapper.readTree(detail.getCorrectAnswerJson()); }
        catch (JacksonException e) { throw new IllegalStateException("Stored answer is unreadable", e); }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", detail.getStatus().name());
        result.put("isCorrect", detail.getStatus() == InteractionStatus.CORRECT);
        result.put("pointsEarned", detail.getPointsEarned());
        result.put("totalScore", participant.getScore());
        boolean imageMapping = correct != null && correct.has("placements");
        result.put("correctAnswer", imageMapping && detail.getStatus() != InteractionStatus.CORRECT ? null : correct);
        result.put("explanation", null);
        return result;
    }

    private SelfSession activeSession(String id, String participantId, boolean lock) {
        SelfSession session = (lock ? sessions.findByIdForUpdate(id) : sessions.findById(id))
                .orElseThrow(this::notFound);
        Participant participant = participant(session, participantId);
        if (session.getStatus() != SessionStatus.ACTIVE || session.getSessionExpiresAt() == null
                || LocalDateTime.now().isAfter(session.getSessionExpiresAt())) throw new ApiException(ErrorCode.CONFLICT, "Session is closed or expired");
        return session;
    }

    private Participant participant(SelfSession session, String participantId) {
        return session.getParticipants().stream().filter(value -> value.getId().equals(participantId)).findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.FORBIDDEN, "Participant does not belong to this session"));
    }

    private Game publishedGame(String shareCode) {
        Game game = games.findByShareCode(shareCode).orElseThrow(this::notFound);
        if (game.getStatus() != GameStatus.PUBLISHED) throw notFound();
        return game;
    }

    private String randomSalt() {
        byte[] bytes = new byte[32]; secureRandom.nextBytes(bytes); return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String opaque(String salt, int index, String value) {
        return "x" + hmac(salt, index + "|" + value).substring(0, 20);
    }

    private String orderingKey(String salt, int index, String value) { return hmac(salt, index + "|order|" + value); }

    private String hmac(String salt, String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(salt.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) { throw new IllegalStateException("Cannot create opaque student IDs", e); }
    }

    private static String normalize(String value) { return value == null ? "" : value.trim().replaceAll("\\s+", " ").toLowerCase(java.util.Locale.ROOT); }
    private static String text(JsonNode node, String key) { return node != null && node.has(key) && node.get(key).isString() ? node.get(key).asString() : null; }
    private static int integer(JsonNode node, String key, int fallback) { return node != null && node.has(key) && node.get(key).canConvertToInt() ? node.get(key).intValue() : fallback; }
    private ApiException validation(String message) { return new ApiException(ErrorCode.VALIDATION_ERROR, message); }
    private ApiException notFound() { return new ApiException(ErrorCode.NOT_FOUND, "Resource not found"); }
}
