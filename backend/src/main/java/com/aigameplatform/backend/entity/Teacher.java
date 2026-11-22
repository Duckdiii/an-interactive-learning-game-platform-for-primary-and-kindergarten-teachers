package com.aigameplatform.backend.entity;

import com.aigameplatform.backend.entity.enums.TeacherStatus;
import com.aigameplatform.backend.entity.enums.UserRole;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "teachers")
@Getter
@Setter
@NoArgsConstructor
public class Teacher {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String fullName;

    private String school;

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // Giữ theo class diagram; mật khẩu thật phải lưu ở passwordHash (BCrypt).
    private String password;

    @Column(nullable = false)
    private String passwordHash;

    // Aggregation: Teacher 1 - 1..* Classroom. Không cascade, Classroom có vòng đời độc lập.
    @OneToMany(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id")
    private List<Classroom> classrooms = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TeacherStatus status = TeacherStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role = UserRole.ROLE_TEACHER;

    // Số lần đăng nhập sai liên tiếp tính từ lần đúng gần nhất (hoặc từ lần khóa tạm gần nhất).
    @Column(nullable = false)
    private int failedLoginAttempts;

    // Thời điểm hết khóa tạm (UTC); null khi không bị khóa.
    private LocalDateTime loginLockedUntil;

    public boolean isLocked() {
        return status == TeacherStatus.LOCKED;
    }

    public boolean isLoginTemporarilyLocked(LocalDateTime now) {
        return loginLockedUntil != null && loginLockedUntil.isAfter(now);
    }

    // Cộng lần sai không làm ở đây mà bằng TeacherRepository.registerFailedLogin (UPDATE nguyên tử, không khóa dòng).

    /** Đăng nhập đúng hoặc đặt lại mật khẩu: xóa bộ đếm và khóa tạm. */
    public void resetLoginFailures() {
        failedLoginAttempts = 0;
        loginLockedUntil = null;
    }
}
