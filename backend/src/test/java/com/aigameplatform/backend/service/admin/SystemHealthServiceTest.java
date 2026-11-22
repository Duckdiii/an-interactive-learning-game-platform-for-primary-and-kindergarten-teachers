package com.aigameplatform.backend.service.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.admin.SystemStatusDto;
import com.aigameplatform.backend.repository.GameSessionRepository;
import com.aigameplatform.backend.repository.ParticipantRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SystemHealthServiceTest {

    @Mock
    private GameSessionRepository gameSessionRepository;

    @Mock
    private ParticipantRepository participantRepository;

    @InjectMocks
    private SystemHealthService service;

    @Test
    @DisplayName("getSystemStatus returns valid server, database, and liveArena metrics")
    void getSystemStatus_returnsValidDto() {
        when(gameSessionRepository.countByStatusIn(anyList())).thenReturn(3L);
        when(participantRepository.count()).thenReturn(25L);

        SystemStatusDto status = service.getSystemStatus();

        assertThat(status).isNotNull();
        assertThat(status.server()).isNotNull();
        assertThat(status.server().cpuUsagePercent()).isNotNull().isGreaterThanOrEqualTo(0.0);
        assertThat(status.server().heapUsagePercent()).isNotNull().isGreaterThanOrEqualTo(0.0);
        assertThat(status.server().activeThreads()).isNotNull().isGreaterThan(0);

        assertThat(status.database()).isNotNull();
        assertThat(status.database().poolUsagePercent()).isEqualTo(14.0);

        assertThat(status.liveArena()).isNotNull();
        assertThat(status.liveArena().activeSessions()).isEqualTo(3);
        assertThat(status.liveArena().connectedClients()).isEqualTo(25);
    }
}
