package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.media.LocalMediaStorageService;
import com.aigameplatform.backend.service.media.MediaUploadService;
import com.aigameplatform.backend.service.media.MediaUploadService.UploadedMedia;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class MediaController {
    private final MediaUploadService uploads;
    private final LocalMediaStorageService storage;

    public MediaController(MediaUploadService uploads, LocalMediaStorageService storage) {
        this.uploads = uploads;
        this.storage = storage;
    }

    @PostMapping(path = "/api/media/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<UploadedMedia> upload(@RequestParam(value = "file", required = false) MultipartFile file,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        if (teacher == null) throw new ApiException(ErrorCode.UNAUTHORIZED, "Yêu cầu đăng nhập tài khoản giáo viên");
        return ApiResponse.ok(uploads.upload(file, teacher.teacherId()));
    }

    @GetMapping("/media/{group}/{name}")
    public ResponseEntity<Resource> download(@PathVariable String group, @PathVariable String name) {
        var file = storage.getPublicMedia(group, name)
                .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy tệp"));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .header("X-Content-Type-Options", "nosniff")
                .body(file.resource());
    }
}
