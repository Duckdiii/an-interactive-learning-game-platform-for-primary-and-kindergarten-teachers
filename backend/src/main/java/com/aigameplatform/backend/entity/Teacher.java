package com.aigameplatform.backend.entity;

import com.aigameplatform.backend.dto.media.SpeechVoice;
import com.aigameplatform.backend.entity.enums.GradeLevel;
import com.aigameplatform.backend.entity.enums.Subject;
import com.aigameplatform.backend.entity.enums.TeacherStatus;
import com.aigameplatform.backend.entity.enums.UserRole;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.DynamicUpdate;

@Entity
// Ghi các trường thực sự thay đổi để đăng nhập hoặc sửa hồ sơ không ghi đè trạng thái khóa.
@DynamicUpdate
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
    private String profileSchool;
    private String textbook;

    @Enumerated(EnumType.STRING)
    private SpeechVoice preferredVoice;

    @Enumerated(EnumType.STRING)
    private Subject preferredSubject;

    @Enumerated(EnumType.STRING)
    private GradeLevel preferredGradeLevel;

    @ElementCollection
    @CollectionTable(name = "teacher_suggestions", joinColumns = @JoinColumn(name = "teacher_id"))
    @MapKeyColumn(name = "suggestion_id", length = 36)
    @Column(name = "topic", nullable = false, length = 200)
    private Map<String, String> suggestions = new HashMap<>();

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

    @Column(nullable = false)
    private long sessionVersion;

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
