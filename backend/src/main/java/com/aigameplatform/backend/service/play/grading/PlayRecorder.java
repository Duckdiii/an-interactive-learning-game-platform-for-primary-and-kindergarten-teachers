package com.aigameplatform.backend.service.play.grading;

import static com.aigameplatform.backend.service.play.grading.PlayInputs.MAX_TYPED_ANSWER_LENGTH;
import static com.aigameplatform.backend.service.play.grading.PlayInputs.normalize;
import static com.aigameplatform.backend.service.play.grading.PlayInputs.text;
import static com.aigameplatform.backend.service.play.grading.PlayInputs.validation;

import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.InteractionStatus;
import com.aigameplatform.backend.entity.interaction.PlayInteractionDetail;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.session.GameSession;
import com.aigameplatform.backend.entity.session.Participant;
import com.aigameplatform.backend.entity.session.SelfSession;
import com.aigameplatform.backend.repository.GameSessionRepository;
import com.aigameplatform.backend.repository.SelfSessionRepository;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Phần chấm và lưu dùng chung của mọi loại game: tính điểm theo thời gian, ghi {@link PlayInteractionDetail}, đánh dấu
 * hoàn thành và dựng kết quả trả học sinh. Các {@link StudentGameHandler} chỉ quyết định đáp án nào là đúng.
 */
@Component
public class PlayRecorder {

    private final JsonMapper mapper;
    private final SelfSessionRepository sessions;
    private final GameSessionRepository liveSessions;

    public PlayRecorder(JsonMapper mapper, SelfSessionRepository sessions, GameSessionRepository liveSessions) {
        this.mapper = mapper;
        this.sessions = sessions;
        this.liveSessions = liveSessions;
    }

    /** Chọn một đáp án trong các lựa chọn đã cấp (Quiz, Audio-Visual Match, Odd One Out ảnh). */
    public Map<String, Object> recordSingleChoice(GradeContext c, String field, Set<String> available, String correctId) {
        String selected = text(c.request(), field);
        if (c.outcome() == null && (selected == null || !available.contains(selected)))
            throw validation(field + " must identify an available option");
        InteractionStatus status = statusOf(c, correctId.equals(selected));
        int points = status == InteractionStatus.CORRECT ? points(c.question(), c.timeSpentMs()) : 0;
        PlayInteractionDetail detail = newDetail(c, status, points);
        detail.setAnswerJson(mapper.valueToTree(c.outcome() == null ? Map.of(field, selected)
                : Map.of("outcome", c.outcome())).toString());
        detail.setCorrectAnswerJson(status == InteractionStatus.CORRECT || status == InteractionStatus.INCORRECT
                ? mapper.valueToTree(Map.of(field, correctId)).toString() : null);
        return attachAndSave(c, detail);
    }

    /** Gõ chữ (Visual Cloze nhập chữ, Word Scramble): đúng khi trùng đáp án sau khi chuẩn hóa chữ hoa, thường và khoảng trắng. */
    public Map<String, Object> recordTyped(GradeContext c, String field, String expected) {
        String typed = text(c.request(), field);
        if (c.outcome() == null && typed == null) throw validation(field + " is required");
        if (c.outcome() == null && typed.length() > MAX_TYPED_ANSWER_LENGTH) throw validation(field + " is too long");
        InteractionStatus status = statusOf(c, c.outcome() == null && normalize(typed).equals(normalize(expected)));
        int points = status == InteractionStatus.CORRECT ? points(c.question(), c.timeSpentMs()) : 0;
        PlayInteractionDetail detail = newDetail(c, status, points);
        detail.setAnswerJson(mapper.valueToTree(c.outcome() == null ? Map.of(field, typed)
                : Map.of("outcome", c.outcome())).toString());
        detail.setCorrectAnswerJson(status == InteractionStatus.CORRECT || status == InteractionStatus.INCORRECT
                ? mapper.valueToTree(Map.of(field, expected)).toString() : null);
        return attachAndSave(c, detail);
    }

    /**
     * Đáp án có cấu trúc (Ordering, Drag &amp; Drop): handler đã kiểm đầu vào và so khớp, đây chỉ lưu. Bỏ qua hoặc hết giờ
     * thì chỉ ghi {@code outcome} và không lưu, không trả đáp án đúng (tránh lộ cho bạn cùng chơi).
     */
    public Map<String, Object> recordGraded(GradeContext c, Map<String, Object> answer, Map<String, Object> correctAnswer,
            boolean correct) {
        InteractionStatus status = statusOf(c, c.outcome() == null && correct);
        int points = status == InteractionStatus.CORRECT ? points(c.question(), c.timeSpentMs()) : 0;
        PlayInteractionDetail detail = newDetail(c, status, points);
        detail.setAnswerJson(mapper.valueToTree(c.outcome() == null ? answer : Map.of("outcome", c.outcome())).toString());
        detail.setCorrectAnswerJson(status == InteractionStatus.CORRECT || status == InteractionStatus.INCORRECT
                ? mapper.valueToTree(correctAnswer).toString() : null);
        return attachAndSave(c, detail);
    }

    private InteractionStatus statusOf(GradeContext c, boolean correct) {
        boolean timeout = "TIMEOUT".equals(c.outcome()) || isOverTime(c.question(), c.timeSpentMs());
        return timeout ? InteractionStatus.TIMEOUT
                : "SKIPPED".equals(c.outcome()) ? InteractionStatus.SKIPPED
                : correct ? InteractionStatus.CORRECT : InteractionStatus.INCORRECT;
    }

    private PlayInteractionDetail newDetail(GradeContext c, InteractionStatus status, int points) {
        PlayInteractionDetail detail = new PlayInteractionDetail();
        detail.setQuestion(c.question());
        detail.setStatus(status);
        detail.setAttemptsCount(1);
        detail.setTimeSpentMs(c.timeSpentMs());
        detail.setDurationSeconds((int) Math.ceil(c.timeSpentMs() / 1000d));
        detail.setPointsEarned(points);
        return detail;
    }

    private Map<String, Object> attachAndSave(GradeContext c, PlayInteractionDetail detail) {
        c.participant().getPlayInteractionDetails().add(detail);
        c.participant().setScore(c.participant().getScore() + detail.getPointsEarned());
        markCompletedIfTerminal(c.participant(), c.session().getGame());
        save(c.session());
        return result(detail, c.participant());
    }

    /** Vượt giới hạn cộng 1 giây dung sai thì coi là hết giờ. */
    public static boolean isOverTime(QuestionGame question, int timeSpentMs) {
        return timeSpentMs > question.getTimeLimit() * 1000L + 1000L;
    }

    /** Điểm giảm tuyến tính tới một nửa theo thời gian (FLD-16). */
    public static int points(QuestionGame question, int timeSpentMs) {
        return (int) Math.round(question.getPoint() * (1 - 0.5 * Math.min(1d,
                (double) timeSpentMs / (question.getTimeLimit() * 1000d))));
    }

    public void markCompletedIfTerminal(Participant participant, Game game) {
        long terminalCount = participant.getPlayInteractionDetails().stream()
                .filter(detail -> detail.getStatus() != InteractionStatus.IN_PROGRESS).count();
        if (terminalCount >= game.getQuestions().size() && participant.getCompletedAt() == null)
            participant.setCompletedAt(LocalDateTime.now());
    }

    // Đường lưu phụ thuộc loại phiên: SELF qua kho riêng (giữ nguyên hành vi cũ), SOLO/TEAM qua kho chung.
    public void save(GameSession session) {
        if (session instanceof SelfSession self) sessions.save(self);
        else liveSessions.save(session);
    }

    /** Kết quả của một câu đã có đáp án cuối; cũng dùng khi học sinh nộp lại cùng câu (không cộng điểm lần nữa). */
    public Map<String, Object> result(PlayInteractionDetail detail, Participant participant) {
        JsonNode correct;
        try { correct = detail.getCorrectAnswerJson() == null ? null : mapper.readTree(detail.getCorrectAnswerJson()); }
        catch (JacksonException e) { throw new IllegalStateException("Stored answer is unreadable", e); }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("status", detail.getStatus().name());
        result.put("isCorrect", detail.getStatus() == InteractionStatus.CORRECT);
        result.put("pointsEarned", detail.getPointsEarned());
        result.put("totalScore", participant.getScore());
        // Đáp án đúng chỉ được lưu khi câu đã xong (Visual Cloze dạng ảnh chỉ lưu khi đủ ô, hết giờ hay bỏ qua thì để null).
        result.put("correctAnswer", correct);
        result.put("explanation", null);
        return result;
    }
}
