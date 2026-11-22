package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.PasswordResetToken;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, String> {

    // Khóa dòng: hai request đặt lại mật khẩu cùng một liên kết chạy đồng thời thì request sau phải thấy usedAt
    // của request trước, không được cùng đổi mật khẩu thành công.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    // Đặt lại xong thì mọi liên kết khác còn hạn của tài khoản cũng hết dùng được.
    @Modifying
    @Query("update PasswordResetToken t set t.usedAt = :now where t.teacher.id = :teacherId and t.usedAt is null")
    int markAllUnusedAsUsed(@Param("teacherId") String teacherId, @Param("now") LocalDateTime now);
}
