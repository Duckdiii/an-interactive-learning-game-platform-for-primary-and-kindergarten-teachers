package com.aigameplatform.backend.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.aigameplatform.backend.dto.admin.BudgetConfigDto;
import com.aigameplatform.backend.dto.admin.DatabaseMetricsDto;
import com.aigameplatform.backend.dto.admin.LiveArenaMetricsDto;
import com.aigameplatform.backend.dto.admin.ServerMetricsDto;
import com.aigameplatform.backend.dto.admin.ServiceUsageDto;
import com.aigameplatform.backend.dto.admin.SystemStatusDto;
import com.aigameplatform.backend.dto.admin.TimeseriesPointDto;
import com.aigameplatform.backend.dto.admin.UsageRangeDto;
import com.aigameplatform.backend.dto.admin.UsageReportDto;
import com.aigameplatform.backend.entity.enums.CostSource;
import com.aigameplatform.backend.entity.enums.ServiceName;
import com.aigameplatform.backend.entity.enums.ServiceStatus;
import com.aigameplatform.backend.exception.GlobalExceptionHandler;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.admin.CostMonitoringService;
import com.aigameplatform.backend.service.admin.SystemHealthService;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
import tools.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class AdminUsageControllerTest {

    @Mock
    private CostMonitoringService costMonitoringService;

    @Mock
    private SystemHealthService systemHealthService;

    private MockMvc mockMvc;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final AuthenticatedTeacher admin = new AuthenticatedTeacher("admin-id", "admin@school.vn", "s1", "ROLE_ADMIN");

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new AdminUsageController(costMonitoringService, systemHealthService))
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .build();

        var auth = new UsernamePasswordAuthenticationToken(admin, null, List.of());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("GET /api/admin/usage returns 200 with usage report")
    void getUsage_returns200() throws Exception {
        UsageReportDto report = new UsageReportDto(
                new UsageRangeDto(Instant.now().minusSeconds(86400 * 7), Instant.now()),
                List.of(new ServiceUsageDto(
                        ServiceName.GENERATIVE_AI, 100, 98, 2, 50000, 10.0, 1.5, "USD",
                        CostSource.ESTIMATED, ServiceStatus.OPERATIONAL
                )),
                List.of(new TimeseriesPointDto("2026-11-20", 15))
        );

        when(costMonitoringService.getUsageReport(eq("7D"), any(), any(), any()))
                .thenReturn(report);

        mockMvc.perform(get("/api/admin/usage").param("range", "7D"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.services[0].service").value("GENERATIVE_AI"))
                .andExpect(jsonPath("$.data.services[0].requests").value(100));
    }

    @Test
    @DisplayName("GET /api/admin/system-status returns 200 with system metrics")
    void getSystemStatus_returns200() throws Exception {
        SystemStatusDto statusDto = new SystemStatusDto(
                new ServerMetricsDto(25.4, 45.2, 38),
                new DatabaseMetricsDto(14.0),
                new LiveArenaMetricsDto(2, 45)
        );

        when(systemHealthService.getSystemStatus()).thenReturn(statusDto);

        mockMvc.perform(get("/api/admin/system-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.server.cpuUsagePercent").value(25.4))
                .andExpect(jsonPath("$.data.liveArena.activeSessions").value(2));
    }

    @Test
    @DisplayName("GET /api/admin/budget-config returns 200 with budget settings")
    void getBudgetConfig_returns200() throws Exception {
        BudgetConfigDto config = new BudgetConfigDto(150.0, 70.0, 90.0, false, 25.0, 16.67);

        when(costMonitoringService.getBudgetConfig()).thenReturn(config);

        mockMvc.perform(get("/api/admin/budget-config"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.monthlyBudget").value(150.0))
                .andExpect(jsonPath("$.data.budgetUsedPercent").value(16.67));
    }

    @Test
    @DisplayName("POST /api/admin/budget-config updates budget and returns 200")
    void updateBudgetConfig_returns200() throws Exception {
        BudgetConfigDto request = new BudgetConfigDto(250.0, 80.0, 95.0, false, null, null);
        BudgetConfigDto updated = new BudgetConfigDto(250.0, 80.0, 95.0, false, 25.0, 10.0);

        when(costMonitoringService.updateBudgetConfig(any(), any(), any())).thenReturn(updated);

        mockMvc.perform(post("/api/admin/budget-config")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.monthlyBudget").value(250.0))
                .andExpect(jsonPath("$.data.yellowPct").value(80.0));
    }
}
