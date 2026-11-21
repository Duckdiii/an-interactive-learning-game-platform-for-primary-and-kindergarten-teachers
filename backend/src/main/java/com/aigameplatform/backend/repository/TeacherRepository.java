package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.Teacher;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TeacherRepository extends JpaRepository<Teacher, String> {

    Optional<Teacher> findByEmail(String email);

    boolean existsByEmail(String email);

    /**
     * Cộng một lần đăng nhập sai bằng một câu UPDATE nguyên tử (các lần sai song song không ghi đè lẫn nhau, và không
     * phải giữ khóa dòng suốt lúc băm mật khẩu). Lần sai thứ {@code maxAttempts} liên tiếp thì đặt khóa tạm tới
     * {@code lockedUntil} và đếm lại từ 0. Cả hai biểu thức SET đều đọc giá trị cũ của dòng.
     */
    @Modifying
    @Query("update Teacher t set "
            + "t.loginLockedUntil = case when t.failedLoginAttempts + 1 >= :maxAttempts then :lockedUntil "
            + "else t.loginLockedUntil end, "
            + "t.failedLoginAttempts = case when t.failedLoginAttempts + 1 >= :maxAttempts then 0 "
            + "else t.failedLoginAttempts + 1 end "
            + "where t.id = :teacherId")
    int registerFailedLogin(
            @Param("teacherId") String teacherId,
            @Param("maxAttempts") int maxAttempts,
            @Param("lockedUntil") LocalDateTime lockedUntil);
}
