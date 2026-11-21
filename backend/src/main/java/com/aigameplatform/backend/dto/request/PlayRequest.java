package com.aigameplatform.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PlayRequest(@NotBlank @Size(max = 20) String nickname) { }
