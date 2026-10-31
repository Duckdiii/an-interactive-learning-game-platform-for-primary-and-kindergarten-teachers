package com.aigameplatform.backend.entity;

import com.aigameplatform.backend.service.curriculum.review.CurriculumEvidenceReview.Status;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity @Table(name = "game_curriculum_reviews")
@Getter @Setter @NoArgsConstructor
public class GameCurriculumReview {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "game_id", nullable = false, unique = true) private Game game;
    @Column(nullable = false) private Instant createdAt = Instant.now();
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Status status;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "jsonb") private String evidence;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "jsonb") private String claims;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable = false, columnDefinition = "jsonb") private String warnings;
    @Column(columnDefinition = "text") private String datasetVersion;
    @Column(columnDefinition = "text") private String curriculumVersion;
    @Column(columnDefinition = "text") private String embeddingModel;
    @Column(columnDefinition = "text") private String reviewerModel;
}
