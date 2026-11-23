package com.aigameplatform.backend.controller;

import com.aigameplatform.backend.dto.classroom.ClassroomDto;
import com.aigameplatform.backend.dto.classroom.ClassroomRequest;
import com.aigameplatform.backend.dto.response.ApiResponse;
import com.aigameplatform.backend.security.AuthenticatedTeacher;
import com.aigameplatform.backend.service.classroom.ClassroomService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Lớp học của giáo viên (UC-16); chỉ điều phối, nghiệp vụ ở {@link ClassroomService}. */
@RestController
@RequestMapping("/api/classrooms")
public class ClassroomController {

    private final ClassroomService classrooms;

    public ClassroomController(ClassroomService classrooms) {
        this.classrooms = classrooms;
    }

    @GetMapping
    public ApiResponse<List<ClassroomDto>> list(@AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(classrooms.list(teacherId(teacher)));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ClassroomDto> create(@Valid @RequestBody ClassroomRequest request,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(classrooms.create(teacherId(teacher), request));
    }

    @PutMapping("/{classroomId}")
    public ApiResponse<ClassroomDto> update(@PathVariable String classroomId, @Valid @RequestBody ClassroomRequest request,
            @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        return ApiResponse.ok(classrooms.update(teacherId(teacher), classroomId, request));
    }

    @DeleteMapping("/{classroomId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String classroomId, @AuthenticationPrincipal AuthenticatedTeacher teacher) {
        classrooms.delete(teacherId(teacher), classroomId);
    }

    private static String teacherId(AuthenticatedTeacher teacher) {
        return teacher == null ? null : teacher.teacherId();
    }
}
