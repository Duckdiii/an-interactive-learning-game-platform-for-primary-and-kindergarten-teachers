package com.aigameplatform.backend.security;

import com.aigameplatform.backend.entity.enums.TeacherStatus;
import com.aigameplatform.backend.repository.TeacherRepository;
import io.jsonwebtoken.JwtException;
import org.springframework.stereotype.Component;

@Component
public class TeacherAccessAuthenticator {

    private final JwtService jwtService;
    private final TeacherRepository teachers;

    public TeacherAccessAuthenticator(JwtService jwtService, TeacherRepository teachers) {
        this.jwtService = jwtService;
        this.teachers = teachers;
    }

    public AuthenticatedTeacher authenticate(String token) {
        AuthenticatedTeacher teacher = jwtService.parseAccessToken(token);
        requireActive(teacher);
        return teacher;
    }

    public void requireActive(AuthenticatedTeacher teacher) {
        if (!teachers.existsByIdAndStatusAndSessionVersion(
                teacher.teacherId(), TeacherStatus.ACTIVE, teacher.sessionVersion())) {
            throw new JwtException("Phiên đăng nhập không còn hiệu lực");
        }
    }
}
