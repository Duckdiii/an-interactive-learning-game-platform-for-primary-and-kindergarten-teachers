package com.aigameplatform.backend.dto.admin;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record BudgetConfigDto(
        @NotNull(message = "monthlyBudget không được null")
        @DecimalMin(value = "0.0", inclusive = false, message = "monthlyBudget phải lớn hơn 0")
        Double monthlyBudget,

        @DecimalMin(value = "0.0", message = "yellowPct tối thiểu là 0")
        Double yellowPct,

        @DecimalMin(value = "0.0", message = "redPct tối thiểu là 0")
        Double redPct,

        Boolean costCapExceeded,
        @JsonInclude(JsonInclude.Include.NON_NULL) Double currentMonthCost,
        @JsonInclude(JsonInclude.Include.NON_NULL) Double budgetUsedPercent
) {
    public Double resolvedYellowPct() {
        return yellowPct != null ? yellowPct : 70.0;
    }

    public Double resolvedRedPct() {
        return redPct != null ? redPct : 90.0;
    }
}
