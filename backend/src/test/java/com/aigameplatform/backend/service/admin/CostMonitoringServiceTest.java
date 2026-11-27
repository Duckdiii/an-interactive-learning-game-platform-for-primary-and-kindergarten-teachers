package com.aigameplatform.backend.service.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

import com.aigameplatform.backend.dto.admin.BudgetConfigDto;
import com.aigameplatform.backend.dto.admin.UsageReportDto;
import com.aigameplatform.backend.entity.BudgetConfig;
import com.aigameplatform.backend.entity.ServiceUsageRecord;
import com.aigameplatform.backend.entity.enums.AuditResult;
import com.aigameplatform.backend.entity.enums.ServiceName;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.repository.BudgetConfigRepository;
import com.aigameplatform.backend.repository.ServiceUsageRecordRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CostMonitoringServiceTest {

    @Mock
    private BudgetConfigRepository budgetConfigRepository;

    @Mock
    private ServiceUsageRecordRepository serviceUsageRecordRepository;

    @Mock
    private AuditLogService auditLogService;

    private static final Instant NOW = Instant.parse("2026-11-24T10:00:00Z");
    private static final LocalDate TODAY = LocalDate.of(2026, 11, 24);
    private CostMonitoringService service;

    @BeforeEach
    void setUp() {
        service = new CostMonitoringService(budgetConfigRepository, serviceUsageRecordRepository, auditLogService,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    @Test
    @DisplayName("getUsageReport without recorded usage reports no traffic, cost or service health")
    void getUsageReport_default7D_returnsReport() {
        when(serviceUsageRecordRepository.findByRecordDateBetweenOrderByRecordDateAsc(any(), any()))
                .thenReturn(List.of());

        UsageReportDto report = service.getUsageReport("7D", null, null, null);

        assertThat(report).isNotNull();
        assertThat(report.services()).hasSize(4);
        assertThat(report.range().from()).isEqualTo(TODAY.minusDays(6).atStartOfDay().toInstant(ZoneOffset.UTC));
        assertThat(report.services()).allSatisfy(row -> {
            assertThat(row.requests()).isZero();
            assertThat(row.tokensUsed()).isNull();
            assertThat(row.cost()).isNull();
            assertThat(row.status().name()).isEqualTo("UNKNOWN");
        });
        assertThat(report.timeseries()).isEmpty();
    }

    @Test
    @DisplayName("getUsageReport with CUSTOM range requires both from and to dates")
    void getUsageReport_customMissingDates_throwsValidation() {
        assertThatThrownBy(() -> service.getUsageReport("CUSTOM", null, null, null))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("from và to là bắt buộc");
    }

    @Test
    @DisplayName("getBudgetConfig returns default config without recording fake spending")
    void getBudgetConfig_returnsDefaultWithoutFabricatingUsage() {
        when(budgetConfigRepository.findById(CostMonitoringService.DEFAULT_BUDGET_ID))
                .thenReturn(Optional.empty());
        when(serviceUsageRecordRepository.findByRecordDateBetweenOrderByRecordDateAsc(any(), any()))
                .thenReturn(List.of());

        BudgetConfigDto config = service.getBudgetConfig();

        assertThat(config).isNotNull();
        assertThat(config.monthlyBudget()).isEqualTo(100.0);
        assertThat(config.yellowPct()).isEqualTo(70.0);
        assertThat(config.redPct()).isEqualTo(90.0);
        assertThat(config.costCapExceeded()).isFalse();
        assertThat(config.currentMonthCost()).isNull();
        assertThat(config.budgetUsedPercent()).isNull();
        verify(budgetConfigRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateBudgetConfig updates values and logs audit")
    void updateBudgetConfig_updatesAndLogsAudit() {
        BudgetConfig existing = BudgetConfig.builder()
                .id(CostMonitoringService.DEFAULT_BUDGET_ID)
                .monthlyBudget(100.0)
                .yellowPct(70.0)
                .redPct(90.0)
                .costCapExceeded(false)
                .build();

        when(budgetConfigRepository.findById(CostMonitoringService.DEFAULT_BUDGET_ID))
                .thenReturn(Optional.of(existing));
        when(budgetConfigRepository.save(any(BudgetConfig.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(serviceUsageRecordRepository.findByRecordDateBetweenOrderByRecordDateAsc(any(), any()))
                .thenReturn(List.of());

        AuthenticatedTeacher actor = new AuthenticatedTeacher(UUID.randomUUID().toString(), "admin@school.edu.vn", "sess-1", "ROLE_ADMIN");
        BudgetConfigDto request = new BudgetConfigDto(200.0, 75.0, 95.0, false, null, null);

        BudgetConfigDto result = service.updateBudgetConfig(request, actor, "127.0.0.1");

        assertThat(result.monthlyBudget()).isEqualTo(200.0);
        verify(auditLogService).logAction(
                eq(actor.teacherId()),
                eq("ROLE_ADMIN"),
                eq("127.0.0.1"),
                eq("UPDATE_BUDGET_CONFIG"),
                eq(AuditResult.SUCCESS),
                isNull(),
                contains("Updated budget: 200.0 USD")
        );
    }

    @Test
    @DisplayName("updateBudgetConfig with negative budget throws validation error")
    void updateBudgetConfig_negativeBudget_throwsValidation() {
        BudgetConfigDto invalid = new BudgetConfigDto(-10.0, 70.0, 90.0, false, null, null);
        AuthenticatedTeacher actor = new AuthenticatedTeacher(UUID.randomUUID().toString(), "admin@school.edu.vn", "sess-1", "ROLE_ADMIN");

        assertThatThrownBy(() -> service.updateBudgetConfig(invalid, actor, "127.0.0.1"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("monthlyBudget phải lớn hơn 0");
    }

    @Test
    void customServiceFilterAlsoFiltersTrafficAndCost() {
        var start = TODAY.minusDays(1);
        when(serviceUsageRecordRepository.findByRecordDateBetweenOrderByRecordDateAsc(start, TODAY))
                .thenReturn(List.of(record(ServiceName.GENERATIVE_AI, 3, 0.12), record(ServiceName.TTS, 8, null)));
        var report = service.getUsageReport("CUSTOM", start.atStartOfDay().toInstant(ZoneOffset.UTC), NOW, ServiceName.TTS);
        assertThat(report.services()).singleElement().satisfies(row -> {
            assertThat(row.service()).isEqualTo(ServiceName.TTS);
            assertThat(row.cost()).isNull();
        });
        assertThat(report.timeseries()).singleElement().satisfies(point -> {
            assertThat(point.requests()).isEqualTo(8);
            assertThat(point.cost()).isNull();
        });
    }

    @Test
    void capUsesCurrentMonthRecordsEvenWithoutDashboardVisitAndIgnoresStaleFlag() {
        var budget = BudgetConfig.builder().monthlyBudget(0.3).costCapExceeded(false).build();
        when(budgetConfigRepository.findById(CostMonitoringService.DEFAULT_BUDGET_ID))
                .thenReturn(Optional.of(budget));
        when(serviceUsageRecordRepository.findByRecordDateBetweenOrderByRecordDateAsc(TODAY.withDayOfMonth(1), TODAY))
                .thenReturn(List.of(record(ServiceName.GENERATIVE_AI, 3, 0.1), record(ServiceName.TTS, 8, 0.2)))
                .thenReturn(List.of());
        assertThat(service.isCostCapExceeded()).isTrue();
        budget.setCostCapExceeded(true);
        assertThat(service.isCostCapExceeded()).isFalse();
    }

    @Test
    void invalidThresholdsAreRejectedBeforeWriting() {
        assertThatThrownBy(() -> service.updateBudgetConfig(
                new BudgetConfigDto(100.0, 95.0, 90.0, null, null, null), null, null))
                .isInstanceOf(ApiException.class);
        verifyNoInteractions(budgetConfigRepository, auditLogService);
    }

    private ServiceUsageRecord record(ServiceName name, int requests, Double cost) {
        return ServiceUsageRecord.builder().serviceName(name).recordDate(TODAY)
                .requests(requests).successCount(requests).failureCount(0).cost(cost).build();
    }
}
