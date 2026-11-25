package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.profile.TeacherProfileInput;
import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.profile.TeacherProfileService;
import com.aigameplatform.backend.service.profile.TeacherProfileService.Suggestion;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/teacher")
public class TeacherProfileController {

    private final TeacherProfileService profiles;

    public TeacherProfileController(TeacherProfileService profiles) {
        this.profiles = profiles;
    }

    @GetMapping("/profile")
    public ApiResponse<TeacherProfileInput> get(@AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(profiles.get(teacher.teacherId()));
    }

    @PostMapping("/profile")
    public ApiResponse<TeacherProfileInput> save(@AuthenticationPrincipal AuthenticatedTeacher teacher,
            @Valid @RequestBody TeacherProfileInput input) {
        return ApiResponse.ok(profiles.save(teacher.teacherId(), input));
    }

    @DeleteMapping("/profile")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthenticatedTeacher teacher) {
        profiles.delete(teacher.teacherId());
    }

    @GetMapping("/suggestions")
    public ApiResponse<List<Suggestion>> list(@AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(profiles.suggestions(teacher.teacherId()));
    }

    @PostMapping("/suggestions")
    public ApiResponse<Suggestion> remember(@AuthenticationPrincipal AuthenticatedTeacher teacher,
            @Valid @RequestBody RememberSuggestion input) {
        return ApiResponse.ok(profiles.remember(teacher.teacherId(), input.topic()));
    }

    @DeleteMapping("/suggestions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forgetAll(@AuthenticationPrincipal AuthenticatedTeacher teacher) {
        profiles.forget(teacher.teacherId(), null);
    }

    @DeleteMapping("/suggestions/{suggestionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forget(@AuthenticationPrincipal AuthenticatedTeacher teacher, @PathVariable String suggestionId) {
        profiles.forget(teacher.teacherId(), suggestionId);
    }

    public record RememberSuggestion(@NotBlank(message = "Nhập chủ đề cần ghi nhớ")
            @Size(max = 200, message = "Chủ đề tối đa 200 ký tự") String topic) { }
}
