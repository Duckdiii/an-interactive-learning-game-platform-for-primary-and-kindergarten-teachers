package com.aigameplatform.backend.entity;

import com.aigameplatform.backend.entity.question.QuestionGame;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "game_narration_assets", uniqueConstraints = @UniqueConstraint(
        name = "uk_game_narration_question", columnNames = {"game_id", "question_id"}))
@Getter
@Setter
@NoArgsConstructor
public class GameNarrationAsset {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false)
    private QuestionGame question;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "content_sha256", nullable = false, length = 64, columnDefinition = "char(64)")
    private String contentSha256;

    @Column(name = "storage_path", nullable = false, length = 512, unique = true)
    private String storagePath;

    @Column(name = "byte_length", nullable = false)
    private int byteLength;

    @Column(name = "duration_millis", nullable = false)
    private int durationMillis;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
