package com.aigameplatform.backend.service.play;

import com.aigameplatform.backend.dto.livearena.ParticipantDto;
import com.aigameplatform.backend.dto.session.*;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.ChoosingStrategy;
import com.aigameplatform.backend.entity.enums.GameStatus;
import com.aigameplatform.backend.entity.enums.InteractionStatus;
import com.aigameplatform.backend.entity.enums.SessionStatus;
import com.aigameplatform.backend.entity.enums.SessionType;
import com.aigameplatform.backend.entity.interaction.PlayInteractionDetail;
import com.aigameplatform.backend.entity.session.*;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.*;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.classroom.ClassroomService;
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SessionService {

    private final ClassroomService classroomService;
    private final GameSessionRepository sessions;
    private final GameRepository games;
    private final TeacherRepository teachers;
    private final ParticipantRepository participants;
    private final TeamRepository teams;
    private final SessionParticipantScoreRepository scores;
    private final BlockedWordList blockedWordList;
    private final LiveArenaService liveArenaService;
    private final LeaderboardRegistry leaderboardRegistry;
    private final SimpMessagingTemplate messagingTemplate;
    private final SecureRandom random = new SecureRandom();

    @Value("${app.live-arena.join-base-url:http://localhost:5173/join}")
    private String joinBaseUrl;

    public SessionService(
            GameSessionRepository sessions,
            GameRepository games,
            TeacherRepository teachers,
            ParticipantRepository participants,
            TeamRepository teams,
            SessionParticipantScoreRepository scores,
            BlockedWordList blockedWordList,
            LiveArenaService liveArenaService,
            LeaderboardRegistry leaderboardRegistry,
            SimpMessagingTemplate messagingTemplate,
            ClassroomService classroomService) {
        this.classroomService = classroomService;
        this.sessions = sessions;
        this.games = games;
        this.teachers = teachers;
        this.participants = participants;
        this.teams = teams;
        this.scores = scores;
        this.blockedWordList = blockedWordList;
        this.liveArenaService = liveArenaService;
        this.leaderboardRegistry = leaderboardRegistry;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public CreateSessionResult createSession(String gameId, CreateSessionRequest req, AuthenticatedTeacher teacherPrincipal) {
        if (teacherPrincipal == null) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, "Yêu cầu đăng nhập tài khoản giáo viên");
        }
        Game game = games.findById(gameId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy trò chơi"));

        if (!game.getAuthor().getId().equals(teacherPrincipal.teacherId())) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Bạn không có quyền mở phòng chơi cho trò chơi này");
        }

        if (game.getStatus() != GameStatus.PUBLISHED) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Chỉ có thể tạo phòng chơi từ trò chơi đã xuất bản (PUBLISHED)");
        }

        if (sessions.existsByGame_IdAndStatusIn(gameId, List.of(SessionStatus.ACTIVE, SessionStatus.WAITING))) {
            throw new ApiException(ErrorCode.CONFLICT, "Trò chơi đã có phiên đang chờ hoặc đang diễn ra");
        }

        Teacher teacher = teachers.findById(teacherPrincipal.teacherId())
                .orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED, "Tài khoản giáo viên không tồn tại"));

        String accessCode = generateUniquePin();
        SessionType type = req != null ? req.getEffectiveSessionType() : SessionType.SOLO;
        String sessionName = (req != null && req.sessionName() != null && !req.sessionName().isBlank())
                ? req.sessionName().trim()
                : (game.getTitle() + " - " + type.name());

        TeacherSession session;
        List<TeamInfo> teamInfos = new ArrayList<>();

        if (type == SessionType.TEAM) {
            TeamSession teamSession = new TeamSession();
            teamSession.setGroupingStrategy(req != null ? req.getEffectiveGroupingStrategy() : ChoosingStrategy.RANDOM);

            List<Team> teamList = new ArrayList<>();
            if (req != null && req.teams() != null && !req.teams().isEmpty()) {
                if (req.teams().size() < 2 || req.teams().size() > 6) {
                    throw new ApiException(ErrorCode.VALIDATION_ERROR, "Số lượng đội phải từ 2 đến 6 đội");
                }
                for (TeamInput input : req.teams()) {
                    Team t = new Team();
                    t.setTeamName(input.teamName().trim());
                    t.setTeamColor(input.teamColor() != null ? input.teamColor() : "#3B82F6");
                    teamList.add(t);
                }
            } else {
                Team t1 = new Team();
                t1.setTeamName("Đội 1");
                t1.setTeamColor("#3B82F6");
                Team t2 = new Team();
                t2.setTeamName("Đội 2");
                t2.setTeamColor("#EF4444");
                teamList.add(t1);
                teamList.add(t2);
            }
            teamSession.setTeams(teamList);
            session = teamSession;
        } else {
            SoloSession soloSession = new SoloSession();
            if (req != null && req.maxParticipants() != null) {
                soloSession.setMaxParticipants(req.maxParticipants());
            }
            session = soloSession;
        }

        if (req != null && req.classroomId() != null && !req.classroomId().isBlank()) {
            session.setClassroom(classroomService.owned(teacherPrincipal.teacherId(), req.classroomId())); // 404 nếu không phải lớp của cô
        }
        session.setGame(game);
        session.setTeacher(teacher);
        session.setSessionName(sessionName);
        session.setAccessCode(accessCode);
        session.setStatus(SessionStatus.WAITING);
        session.setStudentOptionSalt(randomSalt());
        session.setCreatedAt(LocalDateTime.now());

        GameSession saved = sessions.save(session);
        liveArenaService.registerHost(saved.getId(), teacherPrincipal.teacherId());

        if (saved instanceof TeamSession ts) {
            for (Team t : ts.getTeams()) {
                teamInfos.add(new TeamInfo(t.getId(), t.getTeamName(), t.getTeamColor(), 0));
            }
        }

        String joinUrl = joinBaseUrl + "?pin=" + accessCode;
        return new CreateSessionResult(saved.getId(), type, accessCode, joinUrl, SessionStatus.WAITING, teamInfos);
    }

    @Transactional(readOnly = true)
    public List<SessionListItem> listGameSessions(String gameId, SessionType sessionType, SessionStatus status, AuthenticatedTeacher teacher) {
        verifyGameOwnership(gameId, teacher);

        List<GameSession> list;
        if (status != null) {
            list = sessions.findByGame_IdAndStatusOrderByCreatedAtDesc(gameId, status);
        } else {
            list = sessions.findByGame_IdOrderByCreatedAtDesc(gameId);
        }

        return list.stream()
                .filter(s -> {
                    if (sessionType == null) return true;
                    if (sessionType == SessionType.SOLO) return s instanceof SoloSession;
                    if (sessionType == SessionType.TEAM) return s instanceof TeamSession;
                    if (sessionType == SessionType.SELF) return s instanceof SelfSession;
                    return true;
                })
                .map(s -> new SessionListItem(
                        s.getId(),
                        s.getSessionName(),
                        resolveSessionType(s),
                        s.getStatus(),
                        s.getAccessCode(),
                        s.getCreatedAt() != null ? s.getCreatedAt().toString() : null,
                        s.getParticipants().size()))
                .toList();
    }

    @Transactional
    public SessionControlSuccess startSession(String sessionId, AuthenticatedTeacher teacher) {
        GameSession session = getAuthorizedSession(sessionId, teacher);

        if (session.getStatus() == SessionStatus.ACTIVE) {
            return new SessionControlSuccess(sessionId, SessionStatus.ACTIVE);
        }
        if (session.getStatus() != SessionStatus.WAITING) {
            throw new ApiException(ErrorCode.CONFLICT, "Chỉ có thể bắt đầu phiên đang ở trạng thái WAITING");
        }

        if (session instanceof TeamSession ts) {
            List<Team> teamList = ts.getTeams();
            if (teamList.isEmpty()) {
                throw new ApiException(ErrorCode.CONFLICT, "Phiên thi đấu nhóm chưa có đội nào được tạo");
            }
            if (ts.getGroupingStrategy() == ChoosingStrategy.RANDOM) {
                // Tự động phân bổ đều học sinh vào các đội
                List<Participant> unassigned = ts.getParticipants().stream()
                        .filter(p -> p.getTeam() == null)
                        .collect(Collectors.toList());
                Collections.shuffle(unassigned, random);
                for (int i = 0; i < unassigned.size(); i++) {
                    Team target = teamList.get(i % teamList.size());
                    unassigned.get(i).setTeam(target);
                }
            } else {
                // Kiểm tra xem còn ai chưa có đội không
                boolean hasUnassigned = ts.getParticipants().stream().anyMatch(p -> p.getTeam() == null);
                if (hasUnassigned) {
                    throw new ApiException(ErrorCode.CONFLICT, "Còn học sinh chưa được xếp đội");
                }
            }
        }

        session.setStatus(SessionStatus.ACTIVE);
        sessions.save(session);

        messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/state",
                (Object) Map.of("status", "ACTIVE", "phase", "QUESTION"));

        return new SessionControlSuccess(sessionId, SessionStatus.ACTIVE);
    }

    @Transactional
    public SessionControlSuccess pauseSession(String sessionId, AuthenticatedTeacher teacher) {
        GameSession session = getAuthorizedSession(sessionId, teacher);

        if (session.getStatus() == SessionStatus.PAUSED) {
            return new SessionControlSuccess(sessionId, SessionStatus.PAUSED);
        }
        if (session.getStatus() != SessionStatus.ACTIVE) {
            throw new ApiException(ErrorCode.CONFLICT, "Chỉ có thể tạm dừng phiên đang diễn ra (ACTIVE)");
        }

        session.setStatus(SessionStatus.PAUSED);
        sessions.save(session);

        messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/state",
                (Object) Map.of("status", "PAUSED"));

        return new SessionControlSuccess(sessionId, SessionStatus.PAUSED);
    }

    @Transactional
    public SessionControlSuccess resumeSession(String sessionId, AuthenticatedTeacher teacher) {
        GameSession session = getAuthorizedSession(sessionId, teacher);

        if (session.getStatus() == SessionStatus.ACTIVE) {
            return new SessionControlSuccess(sessionId, SessionStatus.ACTIVE);
        }
        if (session.getStatus() != SessionStatus.PAUSED) {
            throw new ApiException(ErrorCode.CONFLICT, "Chỉ có thể tiếp tục phiên đang tạm dừng (PAUSED)");
        }

        session.setStatus(SessionStatus.ACTIVE);
        sessions.save(session);

        messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/state",
                (Object) Map.of("status", "ACTIVE", "phase", "QUESTION"));

        return new SessionControlSuccess(sessionId, SessionStatus.ACTIVE);
    }

    @Transactional
    public SessionControlSuccess closeSession(String sessionId, AuthenticatedTeacher teacher) {
        GameSession session = getAuthorizedSession(sessionId, teacher);

        if (session.getStatus() == SessionStatus.CLOSED) {
            return new SessionControlSuccess(sessionId, SessionStatus.CLOSED);
        }

        LocalDateTime now = LocalDateTime.now();
        for (Participant p : session.getParticipants()) {
            if (p.getCompletedAt() == null) {
                p.setCompletedAt(now);
                p.setNote(Participant.ENDED_BY_CLOSE_NOTE);
            }
        }

        session.setStatus(SessionStatus.CLOSED);
        sessions.save(session);

        liveArenaService.endSessionAndPersistScores(sessionId);

        messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/state",
                (Object) Map.of("status", "CLOSED", "phase", "ENDED"));

        return new SessionControlSuccess(sessionId, SessionStatus.CLOSED);
    }

    @Transactional(readOnly = true)
    public SessionDetail getSession(String sessionId, AuthenticatedTeacher teacher) {
        GameSession session = getAuthorizedSession(sessionId, teacher);

        List<ParticipantDetailDto> participantDtos = session.getParticipants().stream()
                .map(p -> new ParticipantDetailDto(
                        p.getId(),
                        p.getStudentNickname(),
                        p.getCompletedAt() != null ? "COMPLETED" : "PLAYING",
                        p.getScore(),
                        p.getPlayInteractionDetails().size(),
                        p.getTeam() != null ? p.getTeam().getId() : null))
                .toList();

        List<TeamInfo> teamInfos = new ArrayList<>();
        if (session instanceof TeamSession ts) {
            for (Team t : ts.getTeams()) {
                long count = ts.getParticipants().stream()
                        .filter(p -> p.getTeam() != null && p.getTeam().getId().equals(t.getId()))
                        .count();
                teamInfos.add(new TeamInfo(t.getId(), t.getTeamName(), t.getTeamColor(), (int) count));
            }
        }

        return new SessionDetail(
                session.getId(),
                session.getGame().getId(),
                session.getGame().getTitle(),
                session.getSessionName(),
                resolveSessionType(session),
                session.getStatus(),
                session.getAccessCode(),
                session.getCreatedAt() != null ? session.getCreatedAt().toString() : null,
                participantDtos,
                teamInfos);
    }

    @Transactional(readOnly = true)
    public SessionResults getSessionResults(String sessionId, AuthenticatedTeacher teacher) {
        GameSession session = getAuthorizedSession(sessionId, teacher);

        List<Participant> sortedParticipants = new ArrayList<>(session.getParticipants());
        sortedParticipants.sort(Comparator.comparingInt(Participant::getScore).reversed());

        List<ParticipantResultDto> participantResults = new ArrayList<>();
        for (int i = 0; i < sortedParticipants.size(); i++) {
            Participant p = sortedParticipants.get(i);
            int correct = (int) p.getPlayInteractionDetails().stream()
                    .filter(d -> d.getStatus() == InteractionStatus.CORRECT)
                    .count();
            int incorrect = (int) p.getPlayInteractionDetails().stream()
                    .filter(d -> d.getStatus() == InteractionStatus.INCORRECT)
                    .count();
            participantResults.add(new ParticipantResultDto(
                    p.getId(),
                    p.getStudentNickname(),
                    p.getScore(),
                    i + 1,
                    correct,
                    incorrect,
                    p.getTeam() != null ? p.getTeam().getId() : null));
        }

        List<TeamResultDto> teamResults = new ArrayList<>();
        if (session instanceof TeamSession ts) {
            List<TeamRankingHelper> teamRankings = new ArrayList<>();
            for (Team t : ts.getTeams()) {
                List<Participant> members = ts.getParticipants().stream()
                        .filter(p -> p.getTeam() != null && p.getTeam().getId().equals(t.getId()))
                        .toList();
                double avg = members.isEmpty() ? 0.0 : members.stream().mapToInt(Participant::getScore).average().orElse(0.0);
                teamRankings.add(new TeamRankingHelper(t.getId(), t.getTeamName(), t.getTeamColor(), avg, members.size()));
            }
            teamRankings.sort(Comparator.comparingDouble(TeamRankingHelper::score).reversed());
            for (int i = 0; i < teamRankings.size(); i++) {
                TeamRankingHelper h = teamRankings.get(i);
                teamResults.add(new TeamResultDto(h.id(), h.name(), h.color(), h.score(), i + 1, h.memberCount()));
            }
        }

        return new SessionResults(
                session.getId(),
                session.getGame().getTitle(),
                session.getSessionName(),
                session.getStatus(),
                participantResults,
                teamResults);
    }

    @Transactional(readOnly = true)
    public List<ParticipantInteractionDto> getParticipantInteractions(String sessionId, String participantId, AuthenticatedTeacher teacher) {
        GameSession session = getAuthorizedSession(sessionId, teacher);
        Participant participant = session.getParticipants().stream()
                .filter(p -> p.getId().equals(participantId))
                .findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy học sinh trong phiên"));

        return participant.getPlayInteractionDetails().stream()
                .map(d -> new ParticipantInteractionDto(
                        "q" + (d.getQuestion().getItemIndex() + 1),
                        d.getQuestion().getItemIndex(),
                        d.getStatus() == InteractionStatus.CORRECT,
                        d.getPointsEarned(),
                        d.getTimeSpentMs(),
                        null,
                        d.getAnswerJson(),
                        d.getCorrectAnswerJson()))
                .toList();
    }

    @Transactional
    public TeamAssignResult assignParticipantTeam(String sessionId, String participantId, TeamAssignRequest req, AuthenticatedTeacher teacher) {
        GameSession session = getAuthorizedSession(sessionId, teacher);

        if (session.getStatus() != SessionStatus.WAITING) {
            throw new ApiException(ErrorCode.CONFLICT, "Chỉ có thể xếp đội khi phiên còn ở trạng thái WAITING");
        }
        if (!(session instanceof TeamSession ts)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Chỉ phiên thi đấu nhóm (TEAM) mới có chức năng xếp đội");
        }
        Team team = ts.getTeams().stream()
                .filter(t -> t.getId().equals(req.teamId()))
                .findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Đội không thuộc phiên chơi này"));

        Participant participant = ts.getParticipants().stream()
                .filter(p -> p.getId().equals(participantId))
                .findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy học sinh trong phiên"));

        participant.setTeam(team);
        participants.save(participant);

        liveArenaService.addParticipant(sessionId, new ParticipantDto(participant.getId(), participant.getStudentNickname(), true));

        return new TeamAssignResult(participantId, team.getId());
    }

    @Transactional(readOnly = true)
    public SessionByCode getSessionByCode(String accessCode) {
        if (accessCode == null || !accessCode.matches("^[0-9]{6}$")) {
            throw new ApiException(ErrorCode.NOT_FOUND, "Mã PIN không hợp lệ hoặc không tồn tại");
        }
        GameSession session = sessions.findByAccessCode(accessCode)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng chơi với mã PIN này"));

        SessionType type = resolveSessionType(session);
        ChoosingStrategy strategy = session instanceof TeamSession ts ? ts.getGroupingStrategy() : null;

        List<TeamInfo> teamInfos = new ArrayList<>();
        if (session instanceof TeamSession ts) {
            for (Team t : ts.getTeams()) {
                long count = ts.getParticipants().stream()
                        .filter(p -> p.getTeam() != null && p.getTeam().getId().equals(t.getId()))
                        .count();
                teamInfos.add(new TeamInfo(t.getId(), t.getTeamName(), t.getTeamColor(), (int) count));
            }
        }

        return new SessionByCode(
                session.getId(),
                session.getGame().getTitle(),
                type,
                session.getStatus(),
                strategy,
                teamInfos);
    }

    @Transactional
    public JoinResult joinSession(String sessionId, JoinRequest req) {
        if (req == null || req.nickname() == null || req.nickname().trim().isEmpty() || req.nickname().trim().length() > 20) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Biệt danh phải có độ dài từ 1 đến 20 ký tự");
        }
        String nickname = req.nickname().trim();

        if (blockedWordList.findIn(nickname).isPresent()) {
            throw new ApiException(ErrorCode.UNSAFE_CONTENT, "Biệt danh chứa từ ngữ không phù hợp chuẩn học đường");
        }

        GameSession session = sessions.findById(sessionId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng chơi"));

        if (session.getStatus() == SessionStatus.CLOSED) {
            throw new ApiException(ErrorCode.CONFLICT, "Phiên chơi đã kết thúc, không thể tham gia");
        }

        boolean duplicate = session.getParticipants().stream()
                .anyMatch(p -> p.getStudentNickname().equalsIgnoreCase(nickname));
        if (duplicate) {
            throw new ApiException(ErrorCode.CONFLICT, "Biệt danh '" + nickname + "' đã có bạn sử dụng trong phòng. Vui lòng chọn tên khác!");
        }

        if (session instanceof SoloSession solo && solo.getMaxParticipants() > 0) {
            if (session.getParticipants().size() >= solo.getMaxParticipants()) {
                throw new ApiException(ErrorCode.FORBIDDEN, "Phòng chơi đã đủ số lượng học sinh tối đa (" + solo.getMaxParticipants() + ")");
            }
        }

        Participant participant = new Participant();
        participant.setId(UUID.randomUUID().toString());
        participant.setStudentNickname(nickname);
        participant.setScore(0);
        participant.setPlayedAt(LocalDateTime.now());

        Team assignedTeam = null;
        if (session instanceof TeamSession ts) {
            if (ts.getGroupingStrategy() == ChoosingStrategy.FREE_CHOICE && req.teamId() != null) {
                assignedTeam = ts.getTeams().stream()
                        .filter(t -> t.getId().equals(req.teamId()))
                        .findFirst()
                        .orElse(null);
                participant.setTeam(assignedTeam);
            }
        }

        session.getParticipants().add(participant);
        sessions.save(session);

        liveArenaService.addParticipant(sessionId, new ParticipantDto(participant.getId(), participant.getStudentNickname(), true));

        TeamInfo teamInfo = assignedTeam != null
                ? new TeamInfo(assignedTeam.getId(), assignedTeam.getTeamName(), assignedTeam.getTeamColor(), 1)
                : null;

        return new JoinResult(participant.getId(), nickname, session.getStatus(), teamInfo);
    }

    @Transactional
    public TeamAssignResult changeMyTeam(String sessionId, String participantId, TeamAssignRequest req) {
        if (participantId == null || participantId.isBlank()) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, "Thiếu định danh học sinh (X-Participant-Id)");
        }
        GameSession session = sessions.findById(sessionId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy phiên chơi"));

        if (session.getStatus() != SessionStatus.WAITING) {
            throw new ApiException(ErrorCode.CONFLICT, "Chỉ có thể đổi đội khi phòng đang ở trạng thái chờ");
        }
        if (!(session instanceof TeamSession ts)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Phiên chơi không phải thể thức thi đấu nhóm");
        }
        if (ts.getGroupingStrategy() != ChoosingStrategy.FREE_CHOICE) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Chế độ xếp đội hiện tại không cho phép học sinh tự đổi đội");
        }

        Team team = ts.getTeams().stream()
                .filter(t -> t.getId().equals(req.teamId()))
                .findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy đội trong phiên"));

        Participant participant = ts.getParticipants().stream()
                .filter(p -> p.getId().equals(participantId))
                .findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Học sinh không thuộc phiên chơi này"));

        participant.setTeam(team);
        participants.save(participant);

        liveArenaService.addParticipant(sessionId, new ParticipantDto(participant.getId(), participant.getStudentNickname(), true));

        return new TeamAssignResult(participantId, team.getId());
    }

    @Transactional(readOnly = true)
    public LeaderboardDto getLeaderboard(String sessionId, String requesterId, boolean isTeacher) {
        GameSession session = sessions.findById(sessionId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy phiên chơi"));

        // participantId là credential của học sinh: chỉ giáo viên sở hữu phiên được thấy (không phải mọi tài khoản giáo viên).
        isTeacher = isTeacher && session instanceof TeacherSession owned && owned.getTeacher() != null
                && owned.getTeacher().getId().equals(requesterId);
        List<LeaderboardRegistry.ScoreEntry> liveEntries = leaderboardRegistry.getSortedLeaderboard(sessionId);

        List<LeaderboardParticipantDto> participants = new ArrayList<>();
        if (!liveEntries.isEmpty()) {
            for (int i = 0; i < liveEntries.size(); i++) {
                LeaderboardRegistry.ScoreEntry entry = liveEntries.get(i);
                String pid = isTeacher ? entry.getParticipantId() : null;
                participants.add(new LeaderboardParticipantDto(i + 1, entry.getParticipantName(), entry.getTotalScore(), null, pid));
            }
        } else {
            List<Participant> sorted = new ArrayList<>(session.getParticipants());
            sorted.sort(Comparator.comparingInt(Participant::getScore).reversed());
            for (int i = 0; i < sorted.size(); i++) {
                Participant p = sorted.get(i);
                String pid = isTeacher ? p.getId() : null;
                String teamId = p.getTeam() != null ? p.getTeam().getId() : null;
                participants.add(new LeaderboardParticipantDto(i + 1, p.getStudentNickname(), p.getScore(), teamId, pid));
            }
        }

        List<LeaderboardTeamDto> teams = new ArrayList<>();
        if (session instanceof TeamSession ts) {
            List<TeamRankingHelper> teamRankings = new ArrayList<>();
            for (Team t : ts.getTeams()) {
                List<Participant> members = ts.getParticipants().stream()
                        .filter(p -> p.getTeam() != null && p.getTeam().getId().equals(t.getId()))
                        .toList();
                double avg = members.isEmpty() ? 0.0 : members.stream().mapToInt(Participant::getScore).average().orElse(0.0);
                teamRankings.add(new TeamRankingHelper(t.getId(), t.getTeamName(), t.getTeamColor(), avg, members.size()));
            }
            teamRankings.sort(Comparator.comparingDouble(TeamRankingHelper::score).reversed());
            for (int i = 0; i < teamRankings.size(); i++) {
                TeamRankingHelper h = teamRankings.get(i);
                teams.add(new LeaderboardTeamDto(i + 1, h.id(), h.name(), h.color(), h.score(), h.memberCount()));
            }
        }

        return new LeaderboardDto(participants, teams);
    }

    @Transactional(readOnly = true)
    public MyResultDto getMyResult(String sessionId, String participantId) {
        if (participantId == null || participantId.isBlank()) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, "Thiếu định danh học sinh (X-Participant-Id)");
        }
        GameSession session = sessions.findById(sessionId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy phiên chơi"));

        Participant participant = session.getParticipants().stream()
                .filter(p -> p.getId().equals(participantId))
                .findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Học sinh không thuộc phiên chơi này"));

        int correct = (int) participant.getPlayInteractionDetails().stream()
                .filter(d -> d.getStatus() == InteractionStatus.CORRECT)
                .count();
        int incorrect = (int) participant.getPlayInteractionDetails().stream()
                .filter(d -> d.getStatus() == InteractionStatus.INCORRECT)
                .count();
        int answered = participant.getPlayInteractionDetails().size();
        int totalQuestions = session.getGame().getQuestionNum();

        Integer rank = null;
        if (!(session instanceof SelfSession)) {
            List<Participant> sorted = new ArrayList<>(session.getParticipants());
            sorted.sort(Comparator.comparingInt(Participant::getScore).reversed());
            for (int i = 0; i < sorted.size(); i++) {
                if (sorted.get(i).getId().equals(participantId)) {
                    rank = i + 1;
                    break;
                }
            }
        }

        TeamInfo teamInfo = null;
        if (participant.getTeam() != null) {
            Team t = participant.getTeam();
            teamInfo = new TeamInfo(t.getId(), t.getTeamName(), t.getTeamColor(), 0);
        }

        return new MyResultDto(
                participant.getId(),
                participant.getStudentNickname(),
                participant.getCompletedAt() != null ? "COMPLETED" : "PLAYING",
                participant.getScore(),
                correct,
                incorrect,
                totalQuestions,
                answered,
                rank,
                teamInfo);
    }

    private GameSession getAuthorizedSession(String sessionId, AuthenticatedTeacher teacher) {
        if (teacher == null) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, "Yêu cầu đăng nhập tài khoản giáo viên");
        }
        GameSession session = sessions.findById(sessionId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy phiên chơi"));

        if (session instanceof TeacherSession ts) {
            if (!ts.getTeacher().getId().equals(teacher.teacherId())) {
                throw new ApiException(ErrorCode.FORBIDDEN, "Bạn không có quyền quản trị phiên chơi này");
            }
        } else {
            throw new ApiException(ErrorCode.FORBIDDEN, "Phiên chơi không thuộc quyền quản trị của giáo viên");
        }
        return session;
    }

    private void verifyGameOwnership(String gameId, AuthenticatedTeacher teacher) {
        if (teacher == null) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, "Yêu cầu đăng nhập");
        }
        Game game = games.findById(gameId)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy trò chơi"));
        if (!game.getAuthor().getId().equals(teacher.teacherId())) {
            throw new ApiException(ErrorCode.FORBIDDEN, "Bạn không có quyền xem danh sách phiên của trò chơi này");
        }
    }

    private String generateUniquePin() {
        for (int i = 0; i < 10; i++) {
            String pin = String.format("%06d", random.nextInt(1_000_000));
            if (!sessions.existsByAccessCodeAndStatusNot(pin, SessionStatus.CLOSED)) {
                return pin;
            }
        }
        throw new ApiException(ErrorCode.CONFLICT, "Không thể tạo mã PIN mới lúc này. Vui lòng thử lại sau ít phút!");
    }

    private String randomSalt() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static SessionType resolveSessionType(GameSession session) {
        if (session instanceof SoloSession) return SessionType.SOLO;
        if (session instanceof TeamSession) return SessionType.TEAM;
        if (session instanceof SelfSession) return SessionType.SELF;
        return SessionType.SOLO;
    }

    private record TeamRankingHelper(String id, String name, String color, double score, int memberCount) {}
}
