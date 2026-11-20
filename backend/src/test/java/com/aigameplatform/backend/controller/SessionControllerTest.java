package com.aigameplatform.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.dto.session.*;
import com.aigameplatform.backend.entity.enums.ChoosingStrategy;
import com.aigameplatform.backend.entity.enums.SessionStatus;
import com.aigameplatform.backend.entity.enums.SessionType;
import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.play.SessionService;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

@ExtendWith(MockitoExtension.class)
class SessionControllerTest {

    @Mock
    private SessionService sessionService;

    private MockMvc mockMvc;
    private final AuthenticatedTeacher teacher = new AuthenticatedTeacher("teacher-1", "teacher@example.com", "s1");

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new SessionController(sessionService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();

        var auth = new UsernamePasswordAuthenticationToken(teacher, null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void createSessionReturns201() throws Exception {
        var res = new CreateSessionResult("s1", SessionType.SOLO, "123456", "http://join/123456", SessionStatus.WAITING, List.of());
        when(sessionService.createSession(eq("g1"), any(), eq(teacher))).thenReturn(res);

        mockMvc.perform(post("/api/games/g1/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sessionName\":\"Tiết 1\",\"sessionType\":\"SOLO\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sessionId").value("s1"))
                .andExpect(jsonPath("$.data.accessCode").value("123456"))
                .andExpect(jsonPath("$.data.status").value("WAITING"));

        verify(sessionService).createSession(eq("g1"), any(), eq(teacher));
    }

    @Test
    void listGameSessionsReturns200() throws Exception {
        var item = new SessionListItem("s1", "Tiết 1", SessionType.SOLO, SessionStatus.ACTIVE, "123456", "2026-11-20T20:00:00", 5);
        when(sessionService.listGameSessions(eq("g1"), any(), any(), eq(teacher))).thenReturn(List.of(item));

        mockMvc.perform(get("/api/games/g1/sessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].sessionId").value("s1"));
    }

    @Test
    void startSessionReturns200() throws Exception {
        when(sessionService.startSession(eq("s1"), eq(teacher))).thenReturn(new SessionControlSuccess("s1", SessionStatus.ACTIVE));

        mockMvc.perform(post("/api/sessions/s1/start"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    void pauseSessionReturns200() throws Exception {
        when(sessionService.pauseSession(eq("s1"), eq(teacher))).thenReturn(new SessionControlSuccess("s1", SessionStatus.PAUSED));

        mockMvc.perform(post("/api/sessions/s1/pause"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PAUSED"));
    }

    @Test
    void resumeSessionReturns200() throws Exception {
        when(sessionService.resumeSession(eq("s1"), eq(teacher))).thenReturn(new SessionControlSuccess("s1", SessionStatus.ACTIVE));

        mockMvc.perform(post("/api/sessions/s1/resume"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    void closeSessionReturns200() throws Exception {
        when(sessionService.closeSession(eq("s1"), eq(teacher))).thenReturn(new SessionControlSuccess("s1", SessionStatus.CLOSED));

        mockMvc.perform(post("/api/sessions/s1/close"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CLOSED"));
    }

    @Test
    void getSessionDetailReturns200() throws Exception {
        var detail = new SessionDetail("s1", "g1", "Toán 1", "Tiết 1", SessionType.SOLO, SessionStatus.WAITING, "123456", "2026-11-20", List.of(), List.of());
        when(sessionService.getSession(eq("s1"), eq(teacher))).thenReturn(detail);

        mockMvc.perform(get("/api/sessions/s1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessionId").value("s1"))
                .andExpect(jsonPath("$.data.gameTitle").value("Toán 1"));
    }

    @Test
    void getSessionResultsReturns200() throws Exception {
        var results = new SessionResults("s1", "Toán 1", "Tiết 1", SessionStatus.CLOSED, List.of(), List.of());
        when(sessionService.getSessionResults(eq("s1"), eq(teacher))).thenReturn(results);

        mockMvc.perform(get("/api/sessions/s1/results"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessionId").value("s1"));
    }

    @Test
    void assignParticipantTeamReturns200() throws Exception {
        when(sessionService.assignParticipantTeam(eq("s1"), eq("p1"), any(), eq(teacher)))
                .thenReturn(new TeamAssignResult("p1", "t1"));

        mockMvc.perform(put("/api/sessions/s1/participants/p1/team")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"teamId\":\"t1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.participantId").value("p1"))
                .andExpect(jsonPath("$.data.teamId").value("t1"));
    }

    @Test
    void getSessionByCodeReturns200() throws Exception {
        var byCode = new SessionByCode("s1", "Toán 1", SessionType.SOLO, SessionStatus.WAITING, null, List.of());
        when(sessionService.getSessionByCode(eq("123456"))).thenReturn(byCode);

        mockMvc.perform(get("/api/sessions/by-code/123456"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.sessionId").value("s1"))
                .andExpect(jsonPath("$.data.gameTitle").value("Toán 1"));
    }

    @Test
    void joinSessionReturns201() throws Exception {
        var joinRes = new JoinResult("p1", "Bé Bông", SessionStatus.WAITING, null);
        when(sessionService.joinSession(eq("s1"), any())).thenReturn(joinRes);

        mockMvc.perform(post("/api/sessions/s1/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\":\"Bé Bông\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.participantId").value("p1"))
                .andExpect(jsonPath("$.data.nickname").value("Bé Bông"));
    }

    @Test
    void changeMyTeamReturns200() throws Exception {
        when(sessionService.changeMyTeam(eq("s1"), eq("p1"), any()))
                .thenReturn(new TeamAssignResult("p1", "t2"));

        mockMvc.perform(put("/api/sessions/s1/my-team")
                        .header("X-Participant-Id", "p1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"teamId\":\"t2\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.teamId").value("t2"));
    }

    @Test
    void getLeaderboardReturns200() throws Exception {
        var participant = new LeaderboardParticipantDto(1, "Hoa", 1500, null, null);
        var lb = new LeaderboardDto(List.of(participant), List.of());
        when(sessionService.getLeaderboard(eq("s1"), any(), any(Boolean.class))).thenReturn(lb);

        mockMvc.perform(get("/api/sessions/s1/leaderboard"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.participants[0].nickname").value("Hoa"))
                .andExpect(jsonPath("$.data.participants[0].score").value(1500));
    }

    @Test
    void getMyResultReturns200() throws Exception {
        var myResult = new MyResultDto("p1", "Hoa", "PLAYING", 1500, 3, 1, 5, 4, 1, null);
        when(sessionService.getMyResult(eq("s1"), eq("p1"))).thenReturn(myResult);

        mockMvc.perform(get("/api/sessions/s1/my-result")
                        .header("X-Participant-Id", "p1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.score").value(1500))
                .andExpect(jsonPath("$.data.rank").value(1));
    }
}
