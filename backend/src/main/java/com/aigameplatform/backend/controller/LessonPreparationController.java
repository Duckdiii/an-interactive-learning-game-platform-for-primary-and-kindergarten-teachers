package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.exception.ApiException;
import com.aigameplatform.backend.exception.ErrorCode;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.lesson.LessonPreparationService;
import com.aigameplatform.backend.service.lesson.PreparedLesson;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Parses a teacher's lesson document and returns a reviewable idea; it never creates or mutates a game. */
@RestController
@RequestMapping("/api/games")
public class LessonPreparationController {
    private final LessonPreparationService lessons;

    public LessonPreparationController(LessonPreparationService lessons) { this.lessons = lessons; }

    @PostMapping(value = "/prepare", consumes = "multipart/form-data")
    public ApiResponse<PreparedLesson> prepare(@RequestParam Subject subject,
            @RequestParam GradeLevel gradeLevel, @RequestParam(required = false) String idea,
            @RequestParam("file") List<MultipartFile> files,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        if (files == null || files.size() != 1)
            throw new ApiException(ErrorCode.VALIDATION_ERROR, "Vui lòng gửi đúng một tệp giáo án.");
        return ApiResponse.ok(lessons.prepare(subject, gradeLevel, idea, files.get(0), teacher));
    }
}
