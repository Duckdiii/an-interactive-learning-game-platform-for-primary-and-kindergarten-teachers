package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.dto.session.*;
import com.aigameplatform.backend.entity.enums.SessionStatus;
import com.aigameplatform.backend.entity.enums.SessionType;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.play.SessionService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    // 1. Giáo viên tạo phiên Live Arena (SOLO hoặc TEAM)
    @PostMapping({"/api/games/{gameId}/sessions", "/games/{gameId}/sessions"})
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CreateSessionResult> createSession(
            @PathVariable String gameId,
            @Valid @RequestBody(required = false) CreateSessionRequest req,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(sessionService.createSession(gameId, req, teacher));
    }

    // 2. Danh sách phiên của một game
    @GetMapping({"/api/games/{gameId}/sessions", "/games/{gameId}/sessions"})
    public ApiResponse<List<SessionListItem>> listGameSessions(
            @PathVariable String gameId,
            @RequestParam(required = false) SessionType sessionType,
            @RequestParam(required = false) SessionStatus status,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(sessionService.listGameSessions(gameId, sessionType, status, teacher));
    }

    // 3. Bắt đầu phiên (WAITING sang ACTIVE)
    @PostMapping({"/api/sessions/{sessionId}/start", "/sessions/{sessionId}/start"})
    public ApiResponse<SessionControlSuccess> startSession(
            @PathVariable String sessionId,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(sessionService.startSession(sessionId, teacher));
    }

    // 4. Tạm dừng phiên (ACTIVE sang PAUSED)
    @PostMapping({"/api/sessions/{sessionId}/pause", "/sessions/{sessionId}/pause"})
    public ApiResponse<SessionControlSuccess> pauseSession(
            @PathVariable String sessionId,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(sessionService.pauseSession(sessionId, teacher));
    }

    // 5. Tiếp tục phiên (PAUSED sang ACTIVE)
    @PostMapping({"/api/sessions/{sessionId}/resume", "/sessions/{sessionId}/resume"})
    public ApiResponse<SessionControlSuccess> resumeSession(
            @PathVariable String sessionId,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(sessionService.resumeSession(sessionId, teacher));
    }

    // 6. Kết thúc phiên (bất kỳ trạng thái sang CLOSED)
    @PostMapping({"/api/sessions/{sessionId}/close", "/sessions/{sessionId}/close"})
    public ApiResponse<SessionControlSuccess> closeSession(
            @PathVariable String sessionId,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(sessionService.closeSession(sessionId, teacher));
    }

    // 7. Chi tiết phiên cho màn hình Host
    @GetMapping({"/api/sessions/{sessionId}", "/sessions/{sessionId}"})
    public ApiResponse<SessionDetail> getSession(
            @PathVariable String sessionId,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(sessionService.getSession(sessionId, teacher));
    }

    // 8. Kết quả cả phiên (giáo viên)
    @GetMapping({"/api/sessions/{sessionId}/results", "/sessions/{sessionId}/results"})
    public ApiResponse<SessionResults> getSessionResults(
            @PathVariable String sessionId,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(sessionService.getSessionResults(sessionId, teacher));
    }

    // 9. Chi tiết từng câu của một học sinh
    @GetMapping({"/api/sessions/{sessionId}/participants/{participantId}/interactions", "/sessions/{sessionId}/participants/{participantId}/interactions"})
    public ApiResponse<List<ParticipantInteractionDto>> getParticipantInteractions(
            @PathVariable String sessionId,
            @PathVariable String participantId,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(sessionService.getParticipantInteractions(sessionId, participantId, teacher));
    }

    // 10. Giáo viên xếp học sinh vào đội (phiên TEAM)
    @PutMapping({"/api/sessions/{sessionId}/participants/{participantId}/team", "/sessions/{sessionId}/participants/{participantId}/team"})
    public ApiResponse<TeamAssignResult> assignParticipantTeam(
            @PathVariable String sessionId,
            @PathVariable String participantId,
            @Valid @RequestBody TeamAssignRequest req,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(sessionService.assignParticipantTeam(sessionId, participantId, req, teacher));
    }

    // 11. Tra phiên bằng mã PIN (học sinh, public)
    @GetMapping({"/api/sessions/by-code/{accessCode}", "/sessions/by-code/{accessCode}"})
    public ApiResponse<SessionByCode> getSessionByCode(@PathVariable String accessCode) {
        return ApiResponse.ok(sessionService.getSessionByCode(accessCode));
    }

    // 12. Học sinh vào phòng (public)
    @PostMapping({"/api/sessions/{sessionId}/join", "/sessions/{sessionId}/join"})
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<JoinResult> joinSession(
            @PathVariable String sessionId,
            @Valid @RequestBody JoinRequest req) {
        return ApiResponse.ok(sessionService.joinSession(sessionId, req));
    }

    // 13. Học sinh tự đổi đội (FREE_CHOICE)
    @PutMapping({"/api/sessions/{sessionId}/my-team", "/sessions/{sessionId}/my-team"})
    public ApiResponse<TeamAssignResult> changeMyTeam(
            @PathVariable String sessionId,
            @RequestHeader(name = "X-Participant-Id", required = false) String participantIdHeader,
            Principal principal,
            @Valid @RequestBody TeamAssignRequest req) {
        String pid = participantIdHeader != null ? participantIdHeader : (principal != null ? principal.getName() : null);
        return ApiResponse.ok(sessionService.changeMyTeam(sessionId, pid, req));
    }

    // 14. Bảng xếp hạng (giáo viên hoặc học sinh)
    @GetMapping({"/api/sessions/{sessionId}/leaderboard", "/sessions/{sessionId}/leaderboard"})
    public ApiResponse<LeaderboardDto> getLeaderboard(
            @PathVariable String sessionId,
            @RequestHeader(name = "X-Participant-Id", required = false) String participantIdHeader,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        boolean isTeacher = teacher != null;
        String requesterId = isTeacher ? teacher.teacherId() : participantIdHeader;
        return ApiResponse.ok(sessionService.getLeaderboard(sessionId, requesterId, isTeacher));
    }

    // 15. Kết quả lượt chơi của chính mình
    @GetMapping({"/api/sessions/{sessionId}/my-result", "/sessions/{sessionId}/my-result"})
    public ApiResponse<MyResultDto> getMyResult(
            @PathVariable String sessionId,
            @RequestHeader(name = "X-Participant-Id", required = false) String participantIdHeader,
            Principal principal) {
        String pid = participantIdHeader != null ? participantIdHeader : (principal != null ? principal.getName() : null);
        return ApiResponse.ok(sessionService.getMyResult(sessionId, pid));
    }
}
