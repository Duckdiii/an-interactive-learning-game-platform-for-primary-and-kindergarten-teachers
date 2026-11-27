package com.aigameplatform.backend.service.admin;

import com.aigameplatform.backend.dto.admin.BudgetConfigDto;
import com.aigameplatform.backend.dto.admin.ServiceUsageDto;
import com.aigameplatform.backend.dto.admin.TimeseriesPointDto;
import com.aigameplatform.backend.dto.admin.UsageRangeDto;
import com.aigameplatform.backend.dto.admin.UsageReportDto;
import com.aigameplatform.backend.entity.BudgetConfig;
import com.aigameplatform.backend.entity.ServiceUsageRecord;
import com.aigameplatform.backend.entity.enums.AuditResult;
import com.aigameplatform.backend.entity.enums.CostSource;
import com.aigameplatform.backend.entity.enums.ServiceName;
import com.aigameplatform.backend.entity.enums.ServiceStatus;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.repository.BudgetConfigRepository;
import com.aigameplatform.backend.repository.ServiceUsageRecordRepository;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CostMonitoringService {

    public static final String DEFAULT_BUDGET_ID = "default-budget";

    private final BudgetConfigRepository budgetConfigRepository;
    private final ServiceUsageRecordRepository serviceUsageRecordRepository;
    private final AuditLogService auditLogService;
    private final Clock clock;

    public CostMonitoringService(
            BudgetConfigRepository budgetConfigRepository,
            ServiceUsageRecordRepository serviceUsageRecordRepository,
            AuditLogService auditLogService, Clock clock) {
        this.budgetConfigRepository = budgetConfigRepository;
        this.serviceUsageRecordRepository = serviceUsageRecordRepository;
        this.auditLogService = auditLogService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public UsageReportDto getUsageReport(String range, Instant from, Instant to, ServiceName serviceFilter) {
        String rangeKey = range == null || range.isBlank() ? "7D" : range.toUpperCase(Locale.ROOT);
        Instant resolvedTo = clock.instant();
        LocalDate toDate = resolvedTo.atZone(ZoneOffset.UTC).toLocalDate();
        Instant resolvedFrom;
        if (rangeKey.equals("CUSTOM")) {
            if (from == null || to == null || from.isAfter(to)) {
                throw new ApiException(ErrorCode.VALIDATION_ERROR,
                        "from và to là bắt buộc khi range=CUSTOM và from không được sau to");
            }
            resolvedFrom = from;
            resolvedTo = to;
            toDate = to.atZone(ZoneOffset.UTC).toLocalDate();
        } else {
            int previousDays = switch (rangeKey) {
                case "TODAY" -> 0;
                case "7D" -> 6;
                case "30D" -> 29;
                default -> throw new ApiException(ErrorCode.VALIDATION_ERROR, "Khoảng thống kê không hợp lệ");
            };
            resolvedFrom = toDate.minusDays(previousDays).atStartOfDay(ZoneOffset.UTC).toInstant();
        }

        List<ServiceUsageRecord> records = serviceUsageRecordRepository.findByRecordDateBetweenOrderByRecordDateAsc(
                resolvedFrom.atZone(ZoneOffset.UTC).toLocalDate(), toDate);
        Map<ServiceName, List<ServiceUsageRecord>> grouped = new EnumMap<>(ServiceName.class);
        Map<LocalDate, List<ServiceUsageRecord>> byDay = new TreeMap<>();
        for (ServiceUsageRecord record : records) {
            if (serviceFilter != null && record.getServiceName() != serviceFilter) {
                continue;
            }
            grouped.computeIfAbsent(record.getServiceName(), key -> new ArrayList<>()).add(record);
            byDay.computeIfAbsent(record.getRecordDate(), key -> new ArrayList<>()).add(record);
        }

        ServiceName[] targets = serviceFilter != null ? new ServiceName[]{serviceFilter} : ServiceName.values();
        List<ServiceUsageDto> services = new ArrayList<>();
        for (ServiceName target : targets) {
            List<ServiceUsageRecord> rows = grouped.getOrDefault(target, List.of());
            Integer tokens = rows.stream().map(ServiceUsageRecord::getTokensUsed).filter(Objects::nonNull)
                    .reduce(Integer::sum).orElse(null);
            Double cost = costOf(rows).map(BigDecimal::doubleValue).orElse(null);
            services.add(new ServiceUsageDto(target,
                    rows.stream().mapToInt(ServiceUsageRecord::getRequests).sum(),
                    rows.stream().mapToInt(ServiceUsageRecord::getSuccessCount).sum(),
                    rows.stream().mapToInt(ServiceUsageRecord::getFailureCount).sum(),
                    tokens, null, cost, cost == null ? null : "USD",
                    cost == null ? CostSource.UNAVAILABLE : CostSource.ESTIMATED,
                    ServiceStatus.UNKNOWN));
        }
        List<TimeseriesPointDto> timeseries = byDay.entrySet().stream()
                .map(entry -> new TimeseriesPointDto(entry.getKey().toString(),
                        entry.getValue().stream().mapToInt(ServiceUsageRecord::getRequests).sum(),
                        costOf(entry.getValue()).map(BigDecimal::doubleValue).orElse(null)))
                .toList();
        return new UsageReportDto(new UsageRangeDto(resolvedFrom, resolvedTo), services, timeseries);
    }

    @Transactional(readOnly = true)
    public BudgetConfigDto getBudgetConfig() {
        return budgetReport(budgetConfigRepository.findById(DEFAULT_BUDGET_ID).orElseGet(this::defaultBudget));
    }

    private BudgetConfigDto budgetReport(BudgetConfig config) {
        Optional<BigDecimal> cost = currentMonthCost();
        Double percent = cost.isPresent() && config.getMonthlyBudget() > 0
                ? cost.get().doubleValue() / config.getMonthlyBudget() * 100 : null;
        return new BudgetConfigDto(config.getMonthlyBudget(), config.getYellowPct(), config.getRedPct(),
                isAtCap(config, cost), cost.map(BigDecimal::doubleValue).orElse(null), percent);
    }

    private Optional<BigDecimal> currentMonthCost() {
        LocalDate today = clock.instant().atZone(ZoneOffset.UTC).toLocalDate();
        return costOf(serviceUsageRecordRepository.findByRecordDateBetweenOrderByRecordDateAsc(today.withDayOfMonth(1), today));
    }

    private static Optional<BigDecimal> costOf(List<ServiceUsageRecord> records) {
        return records.stream().map(ServiceUsageRecord::getCost).filter(Objects::nonNull)
                .map(BigDecimal::valueOf).reduce(BigDecimal::add);
    }

    private static boolean isAtCap(BudgetConfig config, Optional<BigDecimal> cost) {
        return config.getMonthlyBudget() > 0
                && cost.filter(value -> value.compareTo(BigDecimal.valueOf(config.getMonthlyBudget())) >= 0).isPresent();
    }

    @Transactional
    public BudgetConfigDto updateBudgetConfig(BudgetConfigDto request, AuthenticatedTeacher actor, String ip) {
        if (request == null || request.monthlyBudget() == null || !Double.isFinite(request.monthlyBudget())
                || request.monthlyBudget() <= 0) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "monthlyBudget phải lớn hơn 0");
        }

        double yellow = request.resolvedYellowPct();
        double red = request.resolvedRedPct();
        if (!(yellow > 0 && yellow < red && red <= 100)) {
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Ngưỡng phải thỏa 0 < vàng < đỏ ≤ 100");
        }
        BudgetConfig config = budgetConfigRepository.findById(DEFAULT_BUDGET_ID)
                .orElseGet(this::defaultBudget);

        config.setMonthlyBudget(request.monthlyBudget());
        config.setYellowPct(yellow);
        config.setRedPct(red);
        config.setUpdatedAt(clock.instant());

        BudgetConfigDto report = budgetReport(config);
        config.setCostCapExceeded(report.costCapExceeded());
        BudgetConfig saved = budgetConfigRepository.save(config);

        String actorId = actor != null ? actor.teacherId() : "system";
        String actorRole = actor != null ? actor.role() : "ROLE_ADMIN";

        auditLogService.logAction(
                actorId,
                actorRole,
                ip,
                "UPDATE_BUDGET_CONFIG",
                AuditResult.SUCCESS,
                null,
                "Updated budget: " + saved.getMonthlyBudget() + " USD (Yellow: " + saved.getYellowPct() + "%, Red: " + saved.getRedPct() + "%)"
        );

        return report;
    }

    @Transactional(readOnly = true)
    public boolean isCostCapExceeded() {
        return isAtCap(budgetConfigRepository.findById(DEFAULT_BUDGET_ID)
                .orElseGet(this::defaultBudget), currentMonthCost());
    }

    private BudgetConfig defaultBudget() {
        return BudgetConfig.builder()
                .id(DEFAULT_BUDGET_ID)
                .monthlyBudget(100.0)
                .yellowPct(70.0)
                .redPct(90.0)
                .updatedAt(clock.instant())
                .build();
    }
}
