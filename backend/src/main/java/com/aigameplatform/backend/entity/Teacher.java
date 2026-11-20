package com.aigameplatform.backend.entity;

import com.aigameplatform.backend.entity.enums.TeacherAccountStatus;
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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role = UserRole.ROLE_TEACHER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TeacherAccountStatus status = TeacherAccountStatus.ACTIVE;

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
}
