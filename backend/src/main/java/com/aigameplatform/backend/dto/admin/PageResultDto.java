package com.aigameplatform.backend.dto.admin;

import java.util.List;

public record PageResultDto<T>(
        int page,
        int size,
        long totalItems,
        int totalPages,
        List<T> items
) {}
