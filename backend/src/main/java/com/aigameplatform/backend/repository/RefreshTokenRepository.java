package com.aigameplatform.backend.repository;

import com.aigameplatform.backend.entity.RefreshToken;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String>, RefreshTokenRepositoryCustom {

    // Không khóa dòng: chỉ dùng để biết familyId trước khi gọi lockFamily(...). Nếu đọc bằng findByTokenHash ở
    // đây (khóa dòng) thì một request refresh() (giữ khóa dòng, chờ khóa family) có thể deadlock với một
    // request logout() khác (giữ khóa family, chờ khóa dòng khi chạy revokeFamily).
    @Query("select r.familyId from RefreshToken r where r.tokenHash = :tokenHash")
    Optional<String> findFamilyIdByTokenHash(@Param("tokenHash") String tokenHash);

    // Khóa dòng để hai request refresh đồng thời cùng một token không cùng xoay vòng thành công. Chỉ gọi sau
    // khi đã có lockFamily(...) của family này, để giữ đúng thứ tự khóa (family trước, dòng sau) ở mọi nơi.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update RefreshToken r set r.revokedAt = :now where r.familyId = :familyId and r.revokedAt is null")
    int revokeFamily(@Param("familyId") String familyId, @Param("now") LocalDateTime now);
}
