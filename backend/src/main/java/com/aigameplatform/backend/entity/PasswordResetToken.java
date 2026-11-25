package com.aigameplatform.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "password_reset_tokens")
@Getter
@Setter
@NoArgsConstructor
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    // Aggregation: PasswordResetToken n - 1 Teacher. Không cascade.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;

    @Column(nullable = false, unique = true, length = 64)
    private String tokenHash;

    // Toàn bộ thời gian trong bảng này là UTC.
    @Column(nullable = false)
    private LocalDateTime expiresAt;

    private LocalDateTime usedAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    /** Còn dùng được: chưa dùng lần nào và chưa hết hạn. */
    public boolean isUsable(LocalDateTime now) {
        return usedAt == null && expiresAt.isAfter(now);
    }

    public void markUsed(LocalDateTime now) {
        if (usedAt == null) {
            usedAt = now;
        }
    }
}
