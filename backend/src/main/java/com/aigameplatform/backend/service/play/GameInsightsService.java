package com.aigameplatform.backend.service.play;

import com.aigameplatform.backend.dto.session.GameInsightsDto;
import com.aigameplatform.backend.dto.session.GameInsightsDto.AnswerShareDto;
import com.aigameplatform.backend.dto.session.GameInsightsDto.CommonWrongDto;
import com.aigameplatform.backend.dto.session.GameInsightsDto.QuestionDetailDto;
import com.aigameplatform.backend.dto.session.GameInsightsDto.QuestionInsightDto;
import com.aigameplatform.backend.dto.session.GameInsightsDto.ReviewNeededDto;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.InteractionStatus;
import com.aigameplatform.backend.entity.enums.SessionType;
import com.aigameplatform.backend.entity.interaction.PlayInteractionDetail;
import com.aigameplatform.backend.entity.question.QuestionGame;
import com.aigameplatform.backend.entity.session.GameSession;
import com.aigameplatform.backend.entity.session.Participant;
import com.aigameplatform.backend.entity.session.TeacherSession;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.GameRepository;
import com.aigameplatform.backend.repository.GameSessionRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.play.insight.WrongAnswerLabeler;
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** UC-18: gộp kết quả mọi lượt chơi của một game thành số liệu theo câu. */
@Service
public class GameInsightsService {

    // Ngưỡng "Lớp mình cần ôn lại" (API-CONTRACT 2.8).
    static final double REVIEW_RATE_BELOW = 0.6;
    static final int REVIEW_MIN_ANSWERED = 5;

    // Dưới ngưỡng này số liệu chỉ mang tính tham khảo (UC-18 luồng 4a).
    static final int LOW_SAMPLE_BELOW = 5;

    // Đáp án chỉ được nêu khi lặp lại từ 2 lần (API-CONTRACT mục 7); commonWrong tối đa 3, phân bố tối đa 6.
    static final int SHARE_MIN_COUNT = 2;
    static final int COMMON_WRONG_LIMIT = 3;
    static final int DISTRIBUTION_LIMIT = 6;
    static final int LABEL_MAX_LENGTH = 40;
    static final int REVIEW_NEEDED_MAX_LIMIT = 20;
    // Nhãn từ chữ trẻ gõ có thể chứa thông tin cá nhân (email, số điện thoại, đường dẫn): bỏ nhãn đó, không che từng phần.
    private static final java.util.regex.Pattern PERSONAL_INFO =
            java.util.regex.Pattern.compile("[^\\s@]+@[^\\s@]+|(?<!\\d)(?:\\+?84|0)(?:[\\s.\\-/,_()]*\\d){8,10}(?!\\d)|https?://|www\\.", java.util.regex.Pattern.CASE_INSENSITIVE);

    private final GameRepository games;
    private final GameSessionRepository sessions;
    private final List<WrongAnswerLabeler> labelers;
    private final BlockedWordList blockedWords;
    private final JsonMapper mapper;

    public GameInsightsService(GameRepository games, GameSessionRepository sessions,
            List<WrongAnswerLabeler> labelers, BlockedWordList blockedWords, JsonMapper mapper) {
        this.games = games;
        this.sessions = sessions;
        this.labelers = labelers;
        this.blockedWords = blockedWords;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public GameInsightsDto getInsights(String gameId, SessionType sessionType, LocalDate from, LocalDate to, String classroomId,
            AuthenticatedTeacher teacher) {
        return insights(ownedGame(gameId, teacher), sessionType, from, to, classroomId);
    }

    @Transactional(readOnly = true)
    public QuestionDetailDto getQuestionInsights(String gameId, String questionId, SessionType sessionType,
            LocalDate from, LocalDate to, String classroomId, AuthenticatedTeacher teacher) {
        Game game = ownedGame(gameId, teacher);
        Aggregate aggregate = aggregate(game, sessionType, from, to, classroomId);
        for (QuestionGame question : game.getQuestions()) {
            if (!question.getId().equals(questionId)) continue;
            Tally tally = aggregate.byQuestion.getOrDefault(question.getId(), new Tally());
            List<AnswerShareDto> shares = tally.shares.values().stream()
                    .filter(share -> share.count() >= SHARE_MIN_COUNT)
                    .sorted(Comparator.comparingInt(AnswerShareDto::count).reversed())
                    .limit(DISTRIBUTION_LIMIT)
                    .toList();
            int shown = shares.stream().mapToInt(AnswerShareDto::count).sum();
            return new QuestionDetailDto(question.getId(), question.getItemIndex() + 1, question.insightLabel(),
                    tally.answered, tally.correctRate(), needsReview(tally), shares,
                    tally.labelled - shown, tally.answered - tally.labelled);
        }
        throw new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy câu hỏi");
    }

    /** Các câu yếu nhất trong mọi game đã xuất bản của giáo viên, câu có tỉ lệ đúng thấp nhất trước. */
    @Transactional(readOnly = true)
    public List<ReviewNeededDto> listReviewNeeded(int limit, AuthenticatedTeacher teacher) {
        if (teacher == null) throw new ApiException(ErrorCode.UNAUTHORIZED, "Yêu cầu đăng nhập");
        if (limit < 1 || limit > REVIEW_NEEDED_MAX_LIMIT) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "limit phải từ 1 đến " + REVIEW_NEEDED_MAX_LIMIT);
        }
        List<ReviewNeededDto> weak = new ArrayList<>();
        for (Game game : games.findByAuthor_IdOrderByUpdatedAtDesc(teacher.teacherId())) {
            if (game.getStatus() != GameStatus.PUBLISHED) continue;
            for (QuestionInsightDto question : insights(game, null, null, null, null).questions()) {
                if (!question.needsReview()) continue;
                weak.add(new ReviewNeededDto(game.getId(), game.getTitle(), question.questionId(), question.text(),
                        question.correctRate(), question.commonWrong().isEmpty() ? null : question.commonWrong().get(0)));
            }
        }
        return weak.stream().sorted(Comparator.comparingDouble(ReviewNeededDto::correctRate)).limit(limit).toList();
    }

    /**
     * Số liệu của các câu giáo viên muốn ôn lại, để dựng game ôn tập. Game phải thuộc giáo viên (404 nếu không) và mọi
     * `questionIds` phải thuộc game đó.
     */
    @Transactional(readOnly = true)
    public ReviewContext reviewContext(String teacherId, String gameId, List<String> questionIds) {
        if (teacherId == null || teacherId.isBlank()) throw new ApiException(ErrorCode.UNAUTHORIZED, "Yêu cầu đăng nhập");
        Game game = games.findByIdAndAuthor_Id(gameId, teacherId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy trò chơi"));
        Map<String, QuestionInsightDto> byId = new LinkedHashMap<>();
        for (QuestionInsightDto question : insights(game, null, null, null, null).questions()) byId.put(question.questionId(), question);
        List<QuestionInsightDto> picked = new ArrayList<>();
        for (String id : questionIds) {
            QuestionInsightDto question = byId.get(id);
            if (question == null) throw new ApiException(ErrorCode.VALIDATION_ERROR, "Câu hỏi không thuộc trò chơi này");
            picked.add(question);
        }
        return new ReviewContext(game.getTitle(), picked);
    }

    public record ReviewContext(String gameTitle, List<QuestionInsightDto> questions) {
    }

    private Game ownedGame(String gameId, AuthenticatedTeacher teacher) {
        if (teacher == null) throw new ApiException(ErrorCode.UNAUTHORIZED, "Yêu cầu đăng nhập");
        // Game của người khác trả 404 như game không tồn tại, để không dò được mã game.
        return games.findByIdAndAuthor_Id(gameId, teacher.teacherId())
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy trò chơi"));
    }

    private GameInsightsDto insights(Game game, SessionType sessionType, LocalDate from, LocalDate to, String classroomId) {
        Aggregate aggregate = aggregate(game, sessionType, from, to, classroomId);
        List<QuestionInsightDto> questions = new ArrayList<>();
        Tally total = new Tally();
        for (QuestionGame question : game.getQuestions()) {
            Tally tally = aggregate.byQuestion.getOrDefault(question.getId(), new Tally());
            total.addAll(tally);
            questions.add(new QuestionInsightDto(question.getId(), question.getItemIndex() + 1, question.insightLabel(),
                    tally.answered, tally.correctRate(), tally.avgAttempts(), needsReview(tally), tally.commonWrong()));
        }
        boolean lowSample = aggregate.playCount > 0 && aggregate.playCount < LOW_SAMPLE_BELOW;
        double completionRate = aggregate.playCount == 0 ? 0 : (double) aggregate.completed / aggregate.playCount;
        double avgScore = aggregate.playCount == 0 ? 0 : (double) aggregate.scoreSum / aggregate.playCount;
        return new GameInsightsDto(aggregate.playCount, total.correctRate(), total.avgAttempts(), completionRate, avgScore,
                lowSample, questions);
    }

    private static boolean needsReview(Tally tally) {
        return tally.answered >= REVIEW_MIN_ANSWERED && tally.correctRate() < REVIEW_RATE_BELOW;
    }

    private Aggregate aggregate(Game game, SessionType sessionType, LocalDate from, LocalDate to, String classroomId) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "from không được sau to");
        }
        // shortcut: duyệt entity trong bộ nhớ (có thể N+1 khi có rất nhiều lượt chơi); chuyển sang query GROUP BY khi cần.
        Aggregate aggregate = new Aggregate();
        Map<String, Integer> positions = new HashMap<>();
        for (int i = 0; i < game.getQuestions().size(); i++) positions.put(game.getQuestions().get(i).getId(), i);
        for (GameSession session : sessions.findByGame_IdOrderByCreatedAtDesc(game.getId())) {
            if (!matches(session, sessionType) || !inRange(session, from, to) || !inClassroom(session, classroomId)) continue;
            for (Participant participant : session.getParticipants()) {
                boolean played = false;
                for (PlayInteractionDetail detail : participant.getPlayInteractionDetails()) {
                    if (detail.getStatus() == InteractionStatus.IN_PROGRESS) continue;
                    played = true;
                    QuestionGame question = detail.getQuestion();
                    Tally tally = aggregate.byQuestion.computeIfAbsent(question.getId(), id -> new Tally());
                    tally.add(detail);
                    if (detail.getStatus() == InteractionStatus.CORRECT || detail.getStatus() == InteractionStatus.INCORRECT) {
                        boolean correct = detail.getStatus() == InteractionStatus.CORRECT;
                        label(question, positions.getOrDefault(question.getId(), question.getItemIndex()),
                                session.getStudentOptionSalt(), detail.getAnswerJson())
                                .ifPresent(label -> tally.addAnswer(label, correct));
                    }
                }
                if (played) {
                    aggregate.playCount++;
                    // Phòng đóng khi học sinh chưa làm xong cũng được đặt completedAt, nhưng không tính là hoàn thành.
                    if (participant.finishedByPlaying()) {
                        aggregate.completed++;
                    }
                    aggregate.scoreSum += participant.getScore();
                }
            }
        }
        return aggregate;
    }

    private static boolean matches(GameSession session, SessionType type) {
        return type == null || SessionService.resolveSessionType(session) == type;
    }

    // Lọc theo lớp chỉ giữ phiên của giáo viên đã gắn đúng lớp đó (phiên chơi tự do không thuộc lớp nào).
    // Không cần kiểm lớp có thuộc giáo viên không: phiên của game này chỉ gắn được lớp của chính giáo viên.
    private static boolean inClassroom(GameSession session, String classroomId) {
        return classroomId == null
                || (session instanceof TeacherSession teacherSession && teacherSession.getClassroom() != null
                        && classroomId.equals(teacherSession.getClassroom().getId()));
    }

    // Theo ngày tạo phiên; `to` tính trọn ngày.
    private static boolean inRange(GameSession session, LocalDate from, LocalDate to) {
        LocalDateTime created = session.getCreatedAt();
        if (created == null || (from == null && to == null)) return true;
        if (from != null && created.isBefore(from.atStartOfDay())) return false;
        return to == null || created.isBefore(to.plusDays(1).atStartOfDay());
    }

    /** Nhãn đáp án đã làm sạch (một dòng, giới hạn độ dài, không chứa từ cấm), rỗng nếu không dựng được. */
    private Optional<String> label(QuestionGame question, int index, String salt, String answerJson) {
        if (answerJson == null) return Optional.empty();
        JsonNode answer;
        try {
            answer = mapper.readTree(answerJson);
        } catch (JacksonException e) {
            return Optional.empty();
        }
        return labelers.stream().filter(labeler -> labeler.supports(question)).findFirst()
                .flatMap(labeler -> labeler.label(question, index, salt, answer))
                .map(raw -> raw.replaceAll("\\s+", " ").trim())
                .filter(text -> !PERSONAL_INFO.matcher(text).find()) // lọc trên nhãn đầy đủ, trước khi cắt
                .map(text -> text.length() > LABEL_MAX_LENGTH ? text.substring(0, LABEL_MAX_LENGTH) : text)
                .filter(text -> !text.isEmpty() && blockedWords.findIn(text).isEmpty());
    }

    private static final class Aggregate {
        int playCount;
        int completed;
        long scoreSum;
        final Map<String, Tally> byQuestion = new HashMap<>();
    }

    private static final class Tally {
        int answered;
        int correct;
        int attempts;
        int labelled;
        // Khóa là (nhãn viết thường, đúng/sai) để gộp "CHI" và "chi"; giá trị giữ nhãn gặp đầu tiên và số lần.
        final Map<String, AnswerShareDto> shares = new LinkedHashMap<>();

        void addAnswer(String label, boolean isCorrect) {
            labelled++;
            shares.merge(label.toLowerCase(Locale.ROOT) + "|" + isCorrect, new AnswerShareDto(label, 1, isCorrect),
                    (old, one) -> new AnswerShareDto(old.label(), old.count() + 1, old.correct()));
        }

        List<CommonWrongDto> commonWrong() {
            return shares.values().stream()
                    .filter(share -> !share.correct() && share.count() >= SHARE_MIN_COUNT)
                    .sorted(Comparator.comparingInt(AnswerShareDto::count).reversed())
                    .limit(COMMON_WRONG_LIMIT)
                    .map(share -> new CommonWrongDto(share.label(), share.count()))
                    .toList();
        }

        void add(PlayInteractionDetail detail) {
            answered++;
            if (detail.getStatus() == InteractionStatus.CORRECT) correct++;
            attempts += Math.max(1, detail.getAttemptsCount());
        }

        void addAll(Tally other) {
            answered += other.answered;
            correct += other.correct;
            attempts += other.attempts;
        }

        double correctRate() {
            return answered == 0 ? 0 : (double) correct / answered;
        }

        double avgAttempts() {
            return answered == 0 ? 0 : (double) attempts / answered;
        }
    }
}
