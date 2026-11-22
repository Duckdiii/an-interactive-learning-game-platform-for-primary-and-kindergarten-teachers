package com.aigameplatform.backend.config;

import com.aigameplatform.backend.entity.Teacher;
import com.aigameplatform.backend.entity.enums.TeacherStatus;
import com.aigameplatform.backend.entity.enums.UserRole;
import com.aigameplatform.backend.repository.TeacherRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
public class AdminAccountInitializer implements CommandLineRunner {

    private final TeacherRepository teacherRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminEmail;
    private final String adminPassword;

    public AdminAccountInitializer(
            TeacherRepository teacherRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.email:admin@aigame.local}") String adminEmail,
            @Value("${app.admin.password:}") String adminPassword) {
        this.teacherRepository = teacherRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail.trim().toLowerCase();
        this.adminPassword = adminPassword;
    }

    @Override
    @Transactional
    public void run(String... args) {
        // Không có mật khẩu mặc định: thiếu APP_ADMIN_PASSWORD thì không tạo admin. Profile prod đã dừng khởi động
        // từ application-prod.yml (placeholder không có giá trị mặc định).
        if (adminPassword.isBlank()) {
            log.warn("APP_ADMIN_PASSWORD chưa đặt: bỏ qua việc tạo tài khoản quản trị viên.");
            return;
        }
        if (!teacherRepository.existsByEmail(adminEmail)) {
            Teacher admin = new Teacher();
            admin.setEmail(adminEmail);
            admin.setFullName("Quản trị viên Hệ thống");
            admin.setSchool("Ban Quản Trị AI Game Platform");
            admin.setRole(UserRole.ROLE_ADMIN);
            admin.setStatus(TeacherStatus.ACTIVE);
            admin.setPasswordHash(passwordEncoder.encode(adminPassword));
            teacherRepository.save(admin);
            log.info("Khởi tạo thành công tài khoản Quản trị viên mặc định: {}", adminEmail);
        }
    }
}
