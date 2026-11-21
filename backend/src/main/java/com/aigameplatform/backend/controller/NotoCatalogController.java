package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.media.NotoEmojiCatalog;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Read-only assets available to teachers editing an image question. */
@RestController
@RequestMapping("/api/catalog/noto")
public class NotoCatalogController {
    private final NotoEmojiCatalog catalog;

    public NotoCatalogController(NotoEmojiCatalog catalog) {
        this.catalog = catalog;
    }

    @GetMapping
    public ApiResponse<List<NotoEmojiCatalog.Asset>> assets(@AuthenticationPrincipal AuthenticatedTeacher teacher) {
        if (teacher == null) throw new ApiException(ErrorCode.UNAUTHORIZED, "Cần đăng nhập tài khoản giáo viên");
        return ApiResponse.ok(catalog.assets());
    }
}
