package com.aigameplatform.backend.service.play;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.aigameplatform.backend.dto.session.*;
import com.aigameplatform.backend.entity.Game;
import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.*;
import com.aigameplatform.backend.entity.session.*;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.*;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.validation.safety.BlockedWordList;
import java.time.LocalDateTime;
import java.util.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

class SessionServiceTest {

    private final GameSessionRepository sessions = mock(GameSessionRepository.class);
    private final GameRepository games = mock(GameRepository.class);
    private final TeacherRepository teachers = mock(TeacherRepository.class);
    private final ParticipantRepository participants = mock(ParticipantRepository.class);
    private final TeamRepository teams = mock(TeamRepository.class);
    private final SessionParticipantScoreRepository scores = mock(SessionParticipantScoreRepository.class);
    private final BlockedWordList blockedWordList = mock(BlockedWordList.class);
    private final LiveArenaService liveArenaService = mock(LiveArenaService.class);
    private final LeaderboardRegistry leaderboardRegistry = mock(LeaderboardRegistry.class);
    private final SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);
    private final com.aigameplatform.backend.service.classroom.ClassroomService classroomService = mock(com.aigameplatform.backend.service.classroom.ClassroomService.class);

    private SessionService service;

    private final AuthenticatedTeacher teacherAuth = new AuthenticatedTeacher("teacher-1", "teacher@example.com", "s1");
    private Teacher author;
    private Game game;

    @BeforeEach
    void setUp() {
        service = new SessionService(
                sessions, games, teachers, participants, teams, scores,
                blockedWordList, liveArenaService, leaderboardRegistry, messagingTemplate, classroomService);

        author = new Teacher();
        author.setId("teacher-1");
        author.setEmail("teacher@example.com");

        game = new Game();
        game.setId("game-1");
        game.setTitle("Toán lớp 1");
        game.setStatus(GameStatus.PUBLISHED);
        game.setAuthor(author);
        game.setQuestionNum(5);

        when(games.findById("game-1")).thenReturn(Optional.of(game));
        when(teachers.findById("teacher-1")).thenReturn(Optional.of(author));
        when(blockedWordList.findIn(any())).thenReturn(Optional.empty());
    }

    @Test
    void createSessionSoloSuccess() {
        when(sessions.save(any(GameSession.class))).thenAnswer(inv -> {
            GameSession s = inv.getArgument(0);
            s.setId("session-1");
            return s;
        });

        CreateSessionRequest req = new CreateSessionRequest("Tiết 1", SessionType.SOLO, 30, null, null, null);
        CreateSessionResult result = service.createSession("game-1", req, teacherAuth);

        assertThat(result.sessionId()).isEqualTo("session-1");
        assertThat(result.sessionType()).isEqualTo(SessionType.SOLO);
        assertThat(result.status()).isEqualTo(SessionStatus.WAITING);
        assertThat(result.accessCode()).matches("^[0-9]{6}$");
        verify(liveArenaService).registerHost("session-1", "teacher-1");
    }

    @Test
    void createSessionAttachesTheTeachersClassroom() {
        var classroom = new com.aigameplatform.backend.entity.Classroom();
        classroom.setId("class-1");
        when(classroomService.owned("teacher-1", "class-1")).thenReturn(classroom);
        when(sessions.save(any(GameSession.class))).thenAnswer(inv -> {
            GameSession s = inv.getArgument(0);
            s.setId("session-1");
            return s;
        });

        service.createSession("game-1", new CreateSessionRequest("Tiết 1", SessionType.SOLO, 30, null, null, "class-1"),
                teacherAuth);

        var saved = org.mockito.ArgumentCaptor.forClass(GameSession.class);
        verify(sessions).save(saved.capture());
        assertThat(((com.aigameplatform.backend.entity.session.TeacherSession) saved.getValue()).getClassroom())
                .isSameAs(classroom);
    }

    @Test
    void createSessionRejectsAClassroomThatIsNotTheTeachers() {
        when(classroomService.owned("teacher-1", "other-class"))
                .thenThrow(new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy lớp học"));

        assertThatThrownBy(() -> service.createSession("game-1",
                new CreateSessionRequest(null, SessionType.SOLO, null, null, null, "other-class"), teacherAuth))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(e.getErrorCode()).isEqualTo(ErrorCode.NOT_FOUND));
        verify(sessions, org.mockito.Mockito.never()).save(any(GameSession.class));
    }

    @Test
    void createSessionTeamSuccessWithDefaultTeams() {
        when(sessions.save(any(GameSession.class))).thenAnswer(inv -> {
            TeamSession s = inv.getArgument(0);
            s.setId("session-2");
            for (int i = 0; i < s.getTeams().size(); i++) {
                s.getTeams().get(i).setId("team-" + (i + 1));
            }
            return s;
        });

        CreateSessionRequest req = new CreateSessionRequest("Thi đấu nhóm", SessionType.TEAM, null, ChoosingStrategy.RANDOM, null, null);
        CreateSessionResult result = service.createSession("game-1", req, teacherAuth);

        assertThat(result.sessionId()).isEqualTo("session-2");
        assertThat(result.sessionType()).isEqualTo(SessionType.TEAM);
        assertThat(result.teams()).hasSize(2);
        assertThat(result.teams().get(0).teamName()).isEqualTo("Đội 1");
    }

    @Test
    void createSessionFailsIfGameNotPublished() {
        game.setStatus(GameStatus.DRAFT);
        CreateSessionRequest req = new CreateSessionRequest(null, null, null, null, null, null);

        assertThatThrownBy(() -> service.createSession("game-1", req, teacherAuth))
                .isInstanceOf(ApiException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    void createSessionFailsIfNotAuthor() {
        Teacher other = new Teacher();
        other.setId("teacher-2");
        game.setAuthor(other);

        CreateSessionRequest req = new CreateSessionRequest(null, null, null, null, null, null);

        assertThatThrownBy(() -> service.createSession("game-1", req, teacherAuth))
                .isInstanceOf(ApiException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void createSessionFailsIfActiveOrWaitingSessionExists() {
        when(sessions.existsByGame_IdAndStatusIn(eq("game-1"), any())).thenReturn(true);

        CreateSessionRequest req = new CreateSessionRequest(null, null, null, null, null, null);

        assertThatThrownBy(() -> service.createSession("game-1", req, teacherAuth))
                .isInstanceOf(ApiException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CONFLICT);
    }

    @Test
    void startSessionTransitionsWaitingToActive() {
        SoloSession session = new SoloSession();
        session.setId("session-1");
        session.setGame(game);
        session.setTeacher(author);
        session.setStatus(SessionStatus.WAITING);

        when(sessions.findById("session-1")).thenReturn(Optional.of(session));

        SessionControlSuccess result = service.startSession("session-1", teacherAuth);

        assertThat(result.status()).isEqualTo(SessionStatus.ACTIVE);
        assertThat(session.getStatus()).isEqualTo(SessionStatus.ACTIVE);
        verify(sessions).save(session);
        verify(messagingTemplate).convertAndSend(eq("/topic/session/session-1/state"), any(Object.class));
    }

    @Test
    void startSessionFailsIfManualAssignAndHasUnassignedParticipants() {
        TeamSession session = new TeamSession();
        session.setId("session-team");
        session.setGame(game);
        session.setTeacher(author);
        session.setStatus(SessionStatus.WAITING);
        session.setGroupingStrategy(ChoosingStrategy.MANUAL_ASSIGN);

        Team t1 = new Team();
        t1.setId("t1");
        session.getTeams().add(t1);

        Participant p1 = new Participant();
        p1.setId("p1");
        p1.setStudentNickname("An");
        // p1.team is null
        session.getParticipants().add(p1);

        when(sessions.findById("session-team")).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.startSession("session-team", teacherAuth))
                .isInstanceOf(ApiException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CONFLICT);
    }

    @Test
    void startSessionAutoAssignsRandomStrategy() {
        TeamSession session = new TeamSession();
        session.setId("session-random");
        session.setGame(game);
        session.setTeacher(author);
        session.setStatus(SessionStatus.WAITING);
        session.setGroupingStrategy(ChoosingStrategy.RANDOM);

        Team t1 = new Team(); t1.setId("t1");
        Team t2 = new Team(); t2.setId("t2");
        session.getTeams().addAll(List.of(t1, t2));

        Participant p1 = new Participant(); p1.setId("p1");
        Participant p2 = new Participant(); p2.setId("p2");
        session.getParticipants().addAll(List.of(p1, p2));

        when(sessions.findById("session-random")).thenReturn(Optional.of(session));

        service.startSession("session-random", teacherAuth);

        assertThat(session.getStatus()).isEqualTo(SessionStatus.ACTIVE);
        assertThat(p1.getTeam()).isNotNull();
        assertThat(p2.getTeam()).isNotNull();
    }

    @Test
    void pauseAndResumeStateMachine() {
        SoloSession session = new SoloSession();
        session.setId("session-1");
        session.setGame(game);
        session.setTeacher(author);
        session.setStatus(SessionStatus.ACTIVE);

        when(sessions.findById("session-1")).thenReturn(Optional.of(session));

        SessionControlSuccess pauseRes = service.pauseSession("session-1", teacherAuth);
        assertThat(pauseRes.status()).isEqualTo(SessionStatus.PAUSED);

        SessionControlSuccess resumeRes = service.resumeSession("session-1", teacherAuth);
        assertThat(resumeRes.status()).isEqualTo(SessionStatus.ACTIVE);
    }

    @Test
    void closeSessionSetsCompletedAndPersistsScores() {
        SoloSession session = new SoloSession();
        session.setId("session-1");
        session.setGame(game);
        session.setTeacher(author);
        session.setStatus(SessionStatus.ACTIVE);

        Participant p = new Participant();
        p.setId("p1");
        p.setScore(1500);
        session.getParticipants().add(p);

        when(sessions.findById("session-1")).thenReturn(Optional.of(session));

        SessionControlSuccess closeRes = service.closeSession("session-1", teacherAuth);

        assertThat(closeRes.status()).isEqualTo(SessionStatus.CLOSED);
        assertThat(p.getCompletedAt()).isNotNull();
        assertThat(p.getNote()).isEqualTo("ENDED");
        verify(liveArenaService).endSessionAndPersistScores("session-1");
    }

    @Test
    void joinSessionSuccess() {
        SoloSession session = new SoloSession();
        session.setId("session-1");
        session.setGame(game);
        session.setStatus(SessionStatus.WAITING);

        when(sessions.findById("session-1")).thenReturn(Optional.of(session));

        JoinRequest req = new JoinRequest("Bé Bông", null);
        JoinResult result = service.joinSession("session-1", req);

        assertThat(result.nickname()).isEqualTo("Bé Bông");
        assertThat(result.participantId()).isNotNull();
        assertThat(session.getParticipants()).hasSize(1);
        verify(liveArenaService).addParticipant(eq("session-1"), any());
    }

    @Test
    void joinSessionFailsOnDuplicateNicknameCaseInsensitive() {
        SoloSession session = new SoloSession();
        session.setId("session-1");
        session.setGame(game);
        session.setStatus(SessionStatus.WAITING);

        Participant existing = new Participant();
        existing.setStudentNickname("Bé Bông");
        session.getParticipants().add(existing);

        when(sessions.findById("session-1")).thenReturn(Optional.of(session));

        JoinRequest req = new JoinRequest("bé bông", null);
        assertThatThrownBy(() -> service.joinSession("session-1", req))
                .isInstanceOf(ApiException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CONFLICT);
    }

    @Test
    void joinSessionFailsOnBlockedWord() {
        SoloSession session = new SoloSession();
        session.setId("session-1");
        session.setStatus(SessionStatus.WAITING);

        when(blockedWordList.findIn("từ_cấm")).thenReturn(Optional.of("từ_cấm"));

        JoinRequest req = new JoinRequest("từ_cấm", null);
        assertThatThrownBy(() -> service.joinSession("session-1", req))
                .isInstanceOf(ApiException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.UNSAFE_CONTENT);
    }

    @Test
    void joinSessionFailsIfFull() {
        SoloSession session = new SoloSession();
        session.setId("session-1");
        session.setStatus(SessionStatus.WAITING);
        session.setMaxParticipants(1);

        Participant existing = new Participant();
        existing.setStudentNickname("An");
        session.getParticipants().add(existing);

        when(sessions.findById("session-1")).thenReturn(Optional.of(session));

        JoinRequest req = new JoinRequest("Bình", null);
        assertThatThrownBy(() -> service.joinSession("session-1", req))
                .isInstanceOf(ApiException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.FORBIDDEN);
    }

    @Test
    void getSessionByCodeReturnsSessionInfo() {
        SoloSession session = new SoloSession();
        session.setId("session-1");
        session.setGame(game);
        session.setAccessCode("123456");
        session.setStatus(SessionStatus.WAITING);

        when(sessions.findByAccessCode("123456")).thenReturn(Optional.of(session));

        SessionByCode result = service.getSessionByCode("123456");

        assertThat(result.sessionId()).isEqualTo("session-1");
        assertThat(result.gameTitle()).isEqualTo("Toán lớp 1");
        assertThat(result.status()).isEqualTo(SessionStatus.WAITING);
    }

    @Test
    void getLeaderboardHidesParticipantIdForStudents() {
        SoloSession session = new SoloSession();
        session.setId("session-1");
        session.setTeacher(author);
        session.setGame(game);
        session.setStatus(SessionStatus.ACTIVE);

        Participant p = new Participant();
        p.setId("p-secret");
        p.setStudentNickname("Hoa");
        p.setScore(100);
        session.getParticipants().add(p);

        when(sessions.findById("session-1")).thenReturn(Optional.of(session));

        // When student asks (isTeacher = false)
        LeaderboardDto studentView = service.getLeaderboard("session-1", "p-secret", false);
        assertThat(studentView.participants().get(0).participantId()).isNull();

        // When teacher asks (isTeacher = true)
        LeaderboardDto teacherView = service.getLeaderboard("session-1", "teacher-1", true);
        assertThat(teacherView.participants().get(0).participantId()).isEqualTo("p-secret");

        // Giáo viên khác (không sở hữu phiên) không được thấy participantId
        LeaderboardDto otherTeacherView = service.getLeaderboard("session-1", "teacher-2", true);
        assertThat(otherTeacherView.participants().get(0).participantId()).isNull();
    }

    @Test
    void getMyResultCalculatesScoreAndRank() {
        SoloSession session = new SoloSession();
        session.setId("session-1");
        session.setGame(game);
        session.setStatus(SessionStatus.ACTIVE);

        Participant p1 = new Participant(); p1.setId("p1"); p1.setStudentNickname("Top1"); p1.setScore(200);
        Participant p2 = new Participant(); p2.setId("p2"); p2.setStudentNickname("Top2"); p2.setScore(100);
        session.getParticipants().addAll(List.of(p1, p2));

        when(sessions.findById("session-1")).thenReturn(Optional.of(session));

        MyResultDto myResult = service.getMyResult("session-1", "p2");

        assertThat(myResult.participantId()).isEqualTo("p2");
        assertThat(myResult.nickname()).isEqualTo("Top2");
        assertThat(myResult.score()).isEqualTo(100);
        assertThat(myResult.rank()).isEqualTo(2);
        assertThat(myResult.totalQuestions()).isEqualTo(5);
    }
}
