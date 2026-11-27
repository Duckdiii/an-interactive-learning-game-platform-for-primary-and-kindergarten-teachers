package com.aigameplatform.backend.service.admin;

import com.aigameplatform.backend.dto.admin.DatabaseMetricsDto;
import com.aigameplatform.backend.dto.admin.LiveArenaMetricsDto;
import com.aigameplatform.backend.dto.admin.ServerMetricsDto;
import com.aigameplatform.backend.dto.admin.SystemStatusDto;
import com.aigameplatform.backend.entity.enums.SessionStatus;
import com.aigameplatform.backend.repository.GameSessionRepository;
import com.aigameplatform.backend.repository.ParticipantRepository;
import com.zaxxer.hikari.HikariDataSource;
import java.lang.management.ManagementFactory;
import java.lang.management.OperatingSystemMXBean;
import java.util.List;
import org.springframework.stereotype.Service;
import javax.sql.DataSource;
import org.springframework.messaging.simp.user.SimpUser;
import org.springframework.messaging.simp.user.SimpUserRegistry;

@Service
public class SystemHealthService {

    private final GameSessionRepository gameSessionRepository;
    private final ParticipantRepository participantRepository;

    private final DataSource dataSource;
    private final SimpUserRegistry connectedUsers;

    public SystemHealthService(
            GameSessionRepository gameSessionRepository,
            ParticipantRepository participantRepository, DataSource dataSource, SimpUserRegistry connectedUsers) {
        this.gameSessionRepository = gameSessionRepository;
        this.participantRepository = participantRepository;
        this.dataSource = dataSource;
        this.connectedUsers = connectedUsers;
    }

    public SystemStatusDto getSystemStatus() {
        // Server metrics
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long maxMemory = runtime.maxMemory();
        double heapUsage = Math.round(((double) (totalMemory - freeMemory) / maxMemory * 100.0) * 10.0) / 10.0;

        OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
        Double cpuUsage = null;
        try {
            if (osBean instanceof com.sun.management.OperatingSystemMXBean sunBean) {
                double cpu = sunBean.getCpuLoad() * 100.0;
                if (cpu >= 0) {
                    cpuUsage = Math.round(cpu * 10.0) / 10.0;
                }
            }
        } catch (Exception ignored) {
        }

        int activeThreads = ManagementFactory.getThreadMXBean().getThreadCount();
        ServerMetricsDto server = new ServerMetricsDto(cpuUsage, heapUsage, activeThreads);

        // Database metrics (Hikari pool usage)
        Double poolUsage = null;
        if (dataSource instanceof HikariDataSource hikari && hikari.getHikariPoolMXBean() != null) {
            poolUsage = hikari.getHikariPoolMXBean().getActiveConnections() * 100.0 / hikari.getMaximumPoolSize();
        }
        DatabaseMetricsDto database = new DatabaseMetricsDto(poolUsage);

        // Live Arena active sessions and connected clients
        long activeCount = gameSessionRepository.countByStatusIn(
                List.of(SessionStatus.WAITING, SessionStatus.ACTIVE, SessionStatus.PAUSED)
        );
        List<String> connectedIds = connectedUsers.getUsers().stream().map(SimpUser::getName).toList();
        int clientCount = connectedIds.isEmpty() ? 0 : participantRepository.findAllById(connectedIds).size();

        LiveArenaMetricsDto liveArena = new LiveArenaMetricsDto((int) activeCount, clientCount);

        return new SystemStatusDto(server, database, liveArena);
    }
}
