package com.aigameplatform.backend.dto.admin;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record BudgetConfigDto(
        @NotNull(message = "monthlyBudget không được null")
        @DecimalMin(value = "0.0", message = "monthlyBudget tối thiểu là 0")
        Double monthlyBudget,

        @DecimalMin(value = "0.0", message = "yellowPct tối thiểu là 0")
        Double yellowPct,

        @DecimalMin(value = "0.0", message = "redPct tối thiểu là 0")
        Double redPct,

        Boolean costCapExceeded,
        Double currentMonthCost,
        Double budgetUsedPercent
) {
    public Double resolvedYellowPct() {
        return yellowPct != null ? yellowPct : 70.0;
    }

    public Double resolvedRedPct() {
        return redPct != null ? redPct : 90.0;
    }
}
