package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.service.play.LiveArenaService;
import java.security.Principal;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

@Controller
public class LiveArenaController {

    private final LiveArenaService liveArenaService;

    public LiveArenaController(LiveArenaService liveArenaService) {
        this.liveArenaService = liveArenaService;
    }

    @MessageMapping("/session/{sessionId}/kick/{participantId}")
    public void kickParticipant(
            @DestinationVariable String sessionId,
            @DestinationVariable String participantId,
            Principal principal) {
        String requesterId = principal != null ? principal.getName() : "anonymous";
        liveArenaService.kickParticipant(sessionId, requesterId, participantId);
    }
}
