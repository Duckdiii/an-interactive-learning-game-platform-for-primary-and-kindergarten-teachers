package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.service.play.LiveArenaService;
import java.security.Principal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LiveArenaControllerTest {

    @Mock
    private LiveArenaService liveArenaService;

    @InjectMocks
    private LiveArenaController liveArenaController;

    @Test
    @DisplayName("kickParticipant chuyển tiếp đúng sessionId, requesterId và participantId tới LiveArenaService")
    void testKickParticipantMessageMapping() {
        String sessionId = "sess-100";
        String participantId = "p-200";
        Principal principal = mock(Principal.class);
        when(principal.getName()).thenReturn("teacher-lead");

        liveArenaController.kickParticipant(sessionId, participantId, principal);

        verify(liveArenaService).kickParticipant("sess-100", "teacher-lead", "p-200");
    }
}
