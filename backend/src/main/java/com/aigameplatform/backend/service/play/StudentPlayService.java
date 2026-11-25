package com.aigameplatform.backend.service.play;

import static com.aigameplatform.backend.service.play.grading.PlayInputs.integer;
import static com.aigameplatform.backend.service.play.grading.PlayInputs.notFound;
import static com.aigameplatform.backend.service.play.grading.PlayInputs.text;
import static com.aigameplatform.backend.service.play.grading.PlayInputs.validation;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.InteractionStatus;
import com.aigameplatform.backend.entity.enums.SessionStatus;
import com.aigameplatform.backend.entity.interaction.PlayInteractionDetail;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.session.GameSession;
import com.aigameplatform.backend.entity.session.Participant;
import com.aigameplatform.backend.entity.session.SelfSession;
import com.aigameplatform.backend.entity.session.SoloSession;
import com.aigameplatform.backend.entity.session.TeamSession;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.GameSessionRepository;
import com.aigameplatform.backend.repository.ParticipantRepository;
import com.aigameplatform.backend.repository.SelfSessionRepository;
import com.aigameplatform.backend.service.play.grading.GradeContext;
import com.aigameplatform.backend.service.play.grading.PlayRecorder;
import com.aigameplatform.backend.service.play.grading.RedactContext;
import com.aigameplatform.backend.service.play.grading.StudentGameHandler;
import com.aigameplatform.backend.service.narration.GameNarrationService;
import com.aigameplatform.backend.service.strategy.GameContentStrategyRegistry;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;

/**
 * API của học sinh (chơi tự do SELF và phiên Live Arena SOLO/TEAM): vào chơi, tải đề đã giấu đáp án, nộp đáp án. Việc
 * riêng của từng loại game (giấu đáp án, chấm) nằm ở các {@link StudentGameHandler}; lớp này lo phiên, học sinh, khóa
 * và điều phối.
 */
@Service
public class StudentPlayService {

    private final GameRepository games;
    private final SelfSessionRepository sessions;
    private final GameSessionRepository liveSessions;
    private final ParticipantRepository participants;
    private final GameContentStrategyRegistry strategies;
    private final JsonMapper mapper;
    private final List<StudentGameHandler> handlers;
    private final PlayRecorder recorder;
    private final QuestionClock questionClock;
    private final GameNarrationService narration;
    private final SecureRandom secureRandom = new SecureRandom();

    public StudentPlayService(GameRepository games, SelfSessionRepository sessions,
            GameSessionRepository liveSessions, ParticipantRepository participants,
            GameContentStrategyRegistry strategies, JsonMapper mapper,
            List<StudentGameHandler> handlers, PlayRecorder recorder, QuestionClock questionClock,
            GameNarrationService narration) {
        this.questionClock = questionClock;
        this.games = games;
        this.sessions = sessions;
        this.liveSessions = liveSessions;
        this.participants = participants;
        this.strategies = strategies;
        this.mapper = mapper;
        this.handlers = handlers;
        this.recorder = recorder;
        this.narration = narration;
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
        Game game = games.findByShareCodeForUpdate(shareCode).orElseThrow(() -> notFound());
        if (game.getStatus() != GameStatus.PUBLISHED) throw notFound();
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
        GameSession session = activeSession(sessionId, participantId, false);
        Game game = session.getGame();
        StudentGameHandler handler = handlerFor(game)
                .orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_ERROR, "SELF player API does not support this game type"));
        Participant participant = participant(session, participantId);
        questionClock.start(sessionId, participantId); // mốc đo giờ làm bài phía server (#33)
        var dsl = strategies.get(game.getGameType()).toGameDsl(game);
        ObjectNode response = mapper.valueToTree(dsl);
        ArrayNode questionNodes = (ArrayNode) response.get("questions");
        Map<String, String> narrationUrls = Map.of();
        try {
            Map<String, String> savedUrls = narration.signedUrlsForStudentPlay(game.getId());
            if (savedUrls != null) narrationUrls = savedUrls;
        } catch (RuntimeException ignored) {
            // Audio is optional. A Storage or signing failure must leave the question playable.
        }
        RedactContext context = new RedactContext(game, session.getStudentOptionSalt(), participant);
        for (int i = 0; i < questionNodes.size(); i++) {
            ObjectNode questionNode = (ObjectNode) questionNodes.get(i);
            handler.redact(context, questionNode, game.getQuestions().get(i), i);
            String existingAudioUrl = questionNode.path("audioUrl").asString("");
            boolean mockAudioUrl = GameNarrationService.isMockAudioUrl(existingAudioUrl);
            if (mockAudioUrl) questionNode.putNull("audioUrl");
            String narrationUrl = narrationUrls.get("q" + (i + 1));
            if ((existingAudioUrl.isBlank() || mockAudioUrl) && narrationUrl != null && !narrationUrl.isBlank())
                questionNode.put("audioUrl", narrationUrl);
        }
        ArrayNode answered = mapper.createArrayNode();
        participant.getPlayInteractionDetails().stream()
                .filter(detail -> detail.getStatus() != InteractionStatus.IN_PROGRESS)
                .map(detail -> "q" + (detail.getQuestion().getItemIndex() + 1)).sorted().forEach(answered::add);
        response.set("answeredQuestionIds", answered);
        return response;
    }

    @Transactional
    public Map<String, Object> interact(String sessionId, String participantId, JsonNode request) {
        GameSession session = activeSession(sessionId, participantId, true);
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
        StudentGameHandler handler = handlerFor(game).orElseThrow(() -> notFound());
        if (index >= game.getQuestions().size()) throw notFound();
        QuestionGame question = game.getQuestions().get(index);
        PlayInteractionDetail existing = participant.getPlayInteractionDetails().stream()
                .filter(detail -> detail.getQuestion().getId().equals(question.getId())).findFirst().orElse(null);
        // Câu đã có đáp án cuối: trả lại kết quả cũ, không chấm và không cộng điểm lần nữa.
        if (existing != null && existing.getStatus() != InteractionStatus.IN_PROGRESS) return recorder.result(existing, participant);
        String outcome = text(request, "outcome");
        if (outcome != null && !Set.of("TIMEOUT", "SKIPPED").contains(outcome))
            throw validation("outcome must be TIMEOUT or SKIPPED");
        // Giờ client khai chỉ là số nhỏ nhất: không thể thấp hơn thời gian server thấy từ lúc tải đề hoặc nộp câu trước (#33).
        questionClock.start(sessionId, participantId); // chưa tải đề thì mốc bắt đầu từ lần nộp đầu
        int effectiveMs = (int) Math.min(3_600_000L, Math.max(timeSpentMs,
                questionClock.elapsed(sessionId, participantId).orElse(0L)));
        Map<String, Object> result = handler.grade(new GradeContext(session, participant, question, index, existing, request,
                outcome, effectiveMs));
        if (!"IN_PROGRESS".equals(result.get("status"))) questionClock.advance(sessionId, participantId);
        return result;
    }

    private Optional<StudentGameHandler> handlerFor(Game game) {
        return handlers.stream().filter(handler -> handler.supports(game)).findFirst();
    }

    /** Phiên chơi tự do (có hạn 24 giờ) hoặc phiên Live Arena SOLO/TEAM đang ACTIVE. */
    private GameSession activeSession(String id, String participantId, boolean lock) {
        Optional<SelfSession> self = lock ? sessions.findByIdForUpdate(id) : sessions.findById(id);
        if (self.isPresent()) {
            SelfSession session = self.get();
            participant(session, participantId);
            if (session.getStatus() != SessionStatus.ACTIVE || session.getSessionExpiresAt() == null
                    || LocalDateTime.now().isAfter(session.getSessionExpiresAt())) throw new ApiException(ErrorCode.CONFLICT, "Session is closed or expired");
            return session;
        }
        // Phiên live khóa theo học sinh (không khóa cả phiên) để nhiều em nộp bài cùng lúc không phải xếp hàng.
        // Phải khóa TRƯỚC khi nạp phiên: nạp xong rồi khóa thì Hibernate giữ bản cũ của score và các lượt trả lời.
        if (lock && participantId != null) participants.findByIdForUpdate(participantId);
        GameSession session = liveSessions.findById(id).filter(value -> value instanceof SoloSession || value instanceof TeamSession)
                .orElseThrow(() -> notFound());
        participant(session, participantId); // vẫn kiểm học sinh thuộc phiên (ném FORBIDDEN nếu không)
        if (session.getStatus() != SessionStatus.ACTIVE) throw new ApiException(ErrorCode.CONFLICT, "Session is closed or expired");
        return session;
    }

    private Participant participant(GameSession session, String participantId) {
        return session.getParticipants().stream().filter(value -> value.getId().equals(participantId)).findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.FORBIDDEN, "Participant does not belong to this session"));
    }

    private Game publishedGame(String shareCode) {
        Game game = games.findByShareCode(shareCode).orElseThrow(() -> notFound());
        if (game.getStatus() != GameStatus.PUBLISHED) throw notFound();
        return game;
    }

    private String randomSalt() {
        byte[] bytes = new byte[32]; secureRandom.nextBytes(bytes); return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
