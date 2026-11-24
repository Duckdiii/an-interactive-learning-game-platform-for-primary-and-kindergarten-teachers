package com.aigameplatform.backend.service.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.aigameplatform.backend.dto.admin.SystemStatusDto;
import com.aigameplatform.backend.repository.GameSessionRepository;
import com.aigameplatform.backend.repository.ParticipantRepository;
import com.aigameplatform.backend.entity.session.Participant;
import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;
import java.util.List;
import java.util.Set;
import org.springframework.messaging.simp.user.SimpUser;
import org.springframework.messaging.simp.user.SimpUserRegistry;
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

    @Mock
    private HikariDataSource dataSource;

    @Mock
    private SimpUserRegistry connectedUsers;

    @InjectMocks
    private SystemHealthService service;

    @Test
    @DisplayName("getSystemStatus returns valid server, database, and liveArena metrics")
    void getSystemStatus_returnsValidDto() {
        when(gameSessionRepository.countByStatusIn(anyList())).thenReturn(3L);
        var pool = mock(HikariPoolMXBean.class);
        when(dataSource.getHikariPoolMXBean()).thenReturn(pool);
        when(dataSource.getMaximumPoolSize()).thenReturn(5);
        when(pool.getActiveConnections()).thenReturn(2);
        var student = mock(SimpUser.class);
        when(student.getName()).thenReturn("student");
        when(connectedUsers.getUsers()).thenReturn(Set.of(student));
        when(participantRepository.findAllById(List.of("student"))).thenReturn(List.of(mock(Participant.class)));

        SystemStatusDto status = service.getSystemStatus();

        assertThat(status).isNotNull();
        assertThat(status.server()).isNotNull();
        assertThat(status.server().heapUsagePercent()).isNotNull().isGreaterThanOrEqualTo(0.0);
        assertThat(status.server().activeThreads()).isNotNull().isGreaterThan(0);

        assertThat(status.database()).isNotNull();
        assertThat(status.database().poolUsagePercent()).isEqualTo(40.0);

        assertThat(status.liveArena()).isNotNull();
        assertThat(status.liveArena().activeSessions()).isEqualTo(3);
        assertThat(status.liveArena().connectedClients()).isEqualTo(1);
    }
}
