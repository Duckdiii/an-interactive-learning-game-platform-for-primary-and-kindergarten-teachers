package com.aigameplatform.backend.dto.response;

/** refreshToken không nằm trong body: server gửi qua cookie HttpOnly. */
public record AuthResponse(String accessToken, long expiresIn, TeacherInfo teacher) {
}
