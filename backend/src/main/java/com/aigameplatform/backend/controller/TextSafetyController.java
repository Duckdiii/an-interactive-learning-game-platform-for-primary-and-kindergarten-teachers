package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.game.AiRequestRateLimiter;
import com.aigameplatform.backend.service.validation.ContentSafetyCheck;
import com.aigameplatform.backend.service.validation.ValidationError;
import com.aigameplatform.backend.service.validation.safety.GameTextExtractor.TextEntry;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TextSafetyController {
    private final ContentSafetyCheck safety;
    private final AiRequestRateLimiter requests;

    public TextSafetyController(ContentSafetyCheck safety, AiRequestRateLimiter requests) {
        this.safety = safety;
        this.requests = requests;
    }

    @PostMapping("/api/games/validate-text")
    public ApiResponse<TextVerdict> validateText(@Valid @RequestBody TextRequest request,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        if (teacher == null) throw new ApiException(ErrorCode.UNAUTHORIZED, "Yêu cầu đăng nhập tài khoản giáo viên");
        var texts = request.texts().stream().map(String::strip).filter(text -> !text.isEmpty())
                .map(text -> new TextEntry("texts", text)).toList();
        if (!texts.isEmpty()) {
            try (var permit = requests.acquire("text-safety:" + teacher.teacherId(), 60,
                    "Đang kiểm tra nội dung chữ trước đó. Vui lòng chờ một lát rồi thử lại.")) {
                safety.check(texts).stream().findFirst().ifPresent(error -> {
                    if (error.kind() == ValidationError.Kind.UNAVAILABLE) {
                        throw new ApiException(ErrorCode.SERVICE_UNAVAILABLE, error.message());
                    }
                    throw new ApiException(ErrorCode.UNSAFE_CONTENT, error.message());
                });
            }
        }
        return ApiResponse.ok(new TextVerdict(true));
    }

    public record TextRequest(@NotEmpty @Size(max = 8) List<@NotNull @Size(max = 1000) String> texts) {
    }

    public record TextVerdict(boolean safe) {
    }
}
